/**
 * 文件管理路由
 * 支持文件上传、下载、管理等功能
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { query } = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../runtime/uploads');
const ensureUploadDir = async () => {
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
};

// 配置multer存储
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await ensureUploadDir();
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'text/csv',
    'application/json', 'application/zip',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

/**
 * 上传文件
 * POST /api/files/upload
 */
router.post('/upload', authMiddleware, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    
        return res.status(400).json({
      success: false,
      error: '没有上传文件'
      });
  }

  try {
    const { originalname, filename, mimetype, size } = req.file;
    const config = req.body.config ? JSON.parse(req.body.config) : {};

    // 保存文件信息到数据库
    const result = await query(
      `INSERT INTO uploaded_files 
       (user_id, original_name, stored_name, file_type, file_size, upload_path, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, original_name, stored_name, file_type, file_size, created_at`,
      [req.user.id, originalname, filename, mimetype, size, `/uploads/${filename}`]
    );

    const fileRecord = result.rows[0];
    const fileUrl = `/api/files/download/${fileRecord.id}`;

    res.json({
      success: true,
      data: {
        id: fileRecord.id,
        name: fileRecord.original_name,
        size: fileRecord.file_size,
        type: fileRecord.file_type,
        url: fileUrl,
        uploadDate: fileRecord.created_at
      }
    });

  } catch (error) {
    logger.error('文件上传失败:', error);

    // 清理上传的文件
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        logger.error('清理上传文件失败:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      error: '文件上传失败'
    });
  }
}));

/**
 * 获取文件列表
 * GET /api/files
 */
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type } = req.query;
  const offset = (page - 1) * limit;

  try {
    let whereClause = 'WHERE user_id = $1';
    let params = [req.user.id];

    if (type) {
      whereClause += ` AND file_type LIKE $${params.length + 1}`;
      params.push(`${type}%`);
    }

    // 获取文件列表
    const result = await query(
      `SELECT id, original_name, file_type, file_size, created_at, upload_path
       FROM uploaded_files 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    // 获取总数
    const countResult = await query(
      `SELECT COUNT(*) as total FROM uploaded_files ${whereClause}`,
      params
    );

    const files = result.rows.map(row => ({
      id: row.id,
      name: row.original_name,
      type: row.file_type,
      size: row.file_size,
      uploadDate: row.created_at,
      url: `/api/files/download/${row.id}`
    }));

    res.json({
      success: true,
      data: {
        files,
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    });

  } catch (error) {
    logger.error('获取文件列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取文件列表失败'
    });
  }
}));

/**
 * 下载文件
 * GET /api/files/download/:id
 */
router.get('/download/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // 获取文件信息
    const result = await query(
      'SELECT * FROM uploaded_files WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      
        return res.status(404).json({
        success: false,
        error: '文件不存在'
      });
    }

    const file = result.rows[0];
    const filePath = path.join(uploadDir, file.stored_name);

    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: '文件已被删除'
      });
    }

    // 设置响应头
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
    res.setHeader('Content-Type', file.file_type);

    // 发送文件
    res.sendFile(filePath);

  } catch (error) {
    logger.error('文件下载失败:', error);
    res.status(500).json({
      success: false,
      error: '文件下载失败'
    });
  }
}));

/**
 * 删除文件
 * DELETE /api/files/:id
 */
router.delete('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // 获取文件信息
    const result = await query(
      'SELECT * FROM uploaded_files WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      
        return res.status(404).json({
        success: false,
        error: '文件不存在'
      });
    }

    const file = result.rows[0];
    const filePath = path.join(uploadDir, file.stored_name);

    // 从数据库删除记录
    await query('DELETE FROM uploaded_files WHERE id = $1', [id]);

    // 删除物理文件
    try {
      await fs.unlink(filePath);
    } catch (unlinkError) {
      logger.warn('删除物理文件失败:', unlinkError);
    }

    res.json({
      success: true,
      message: '文件已删除'
    });

  } catch (error) {
    logger.error('删除文件失败:', error);
    res.status(500).json({
      success: false,
      error: '删除文件失败'
    });
  }
}));

/**
 * 更新文件元数据
 * PUT /api/files/:id/metadata
 */
router.put('/:id/metadata', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, tags } = req.body;

  try {
    // 检查文件是否存在
    const checkResult = await query(
      'SELECT id FROM uploaded_files WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (checkResult.rows.length === 0) {
      
        return res.status(404).json({
        success: false,
        error: '文件不存在'
      });
    }

    // 更新元数据
    const updateFields = [];
    const params = [];
    let paramIndex = 1;

    if (name) {
      updateFields.push(`original_name = $${paramIndex++}`);
      params.push(name);
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      params.push(description);
    }

    if (tags !== undefined) {
      updateFields.push(`tags = $${paramIndex++}`);
      params.push(JSON.stringify(tags));
    }

    if (updateFields.length === 0) {
      
        return res.status(400).json({
        success: false,
        error: '没有提供要更新的字段'
      });
    }

    updateFields.push(`updated_at = NOW()`);
    params.push(id);

    await query(
      `UPDATE uploaded_files SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
      params
    );

    res.json({
      success: true,
      message: '文件元数据已更新'
    });

  } catch (error) {
    logger.error('更新文件元数据失败:', error);
    res.status(500).json({
      success: false,
      error: '更新失败'
    });
  }
}));

module.exports = router;
