/**
 * 环境变量管理组件
 * 提供类似Postman的Environment管理界面
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondary,
  Chip,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Tooltip,
  Divider,
  Grid,
  InputAdornment,
  Collapse,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Settings as SettingsIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  PlayArrow as PlayIcon,
  Refresh as RefreshIcon,
  Language as GlobalIcon,
  LocationOn as LocalIcon,
  History as HistoryIcon,
  Code as CodeIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const EnvironmentManager = () => {
  // 状态管理
  const [environments, setEnvironments] = useState([]);
  const [activeEnvironment, setActiveEnvironment] = useState(null);
  const [selectedEnvironment, setSelectedEnvironment] = useState(null);
  const [globalVariables, setGlobalVariables] = useState([]);
  const [variableHistory, setVariableHistory] = useState([]);
  
  // UI状态
  const [tabValue, setTabValue] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [variableDialogOpen, setVariableDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: 'info' });
  const [showSecrets, setShowSecrets] = useState({});
  const [expandedSections, setExpandedSections] = useState({});
  
  // 表单数据
  const [newEnvironment, setNewEnvironment] = useState({
    name: '',
    description: '',
    baseUrl: '',
    variables: []
  });
  
  const [newVariable, setNewVariable] = useState({
    key: '',
    value: '',
    type: 'text',
    description: '',
    secret: false
  });

  // 动态变量列表
  const dynamicVariables = [
    { key: '$timestamp', description: 'Unix时间戳' },
    { key: '$isoTimestamp', description: 'ISO格式时间戳' },
    { key: '$randomInt', description: '随机整数' },
    { key: '$randomFloat', description: '随机浮点数' },
    { key: '$randomString', description: '随机字符串' },
    { key: '$guid', description: 'UUID/GUID' },
    { key: '$randomEmail', description: '随机邮箱' },
    { key: '$randomUserAgent', description: '随机User-Agent' },
    { key: '$randomIP', description: '随机IP地址' },
    { key: '$randomPort', description: '随机端口号' },
    { key: '$randomColor', description: '随机颜色值' }
  ];

  // 加载环境列表
  const loadEnvironments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/environments`);
      setEnvironments(response.data.data || []);
      
      // 获取活跃环境
      const activeResponse = await axios.get(`${API_BASE_URL}/environments/active/current`);
      if (activeResponse.data.data) {
        setActiveEnvironment(activeResponse.data.data);
        setSelectedEnvironment(activeResponse.data.data);
      }
    } catch (error) {
      console.error('加载环境失败:', error);
      showMessage('加载环境失败', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载全局变量
  const loadGlobalVariables = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/environments/global/variables`);
      setGlobalVariables(response.data.data || []);
    } catch (error) {
      console.error('加载全局变量失败:', error);
    }
  }, []);

  // 加载变量历史
  const loadVariableHistory = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/environments/history/variables`);
      setVariableHistory(response.data.data || []);
    } catch (error) {
      console.error('加载变量历史失败:', error);
    }
  }, []);

  // 组件加载时初始化
  useEffect(() => {
    loadEnvironments();
    loadGlobalVariables();
    loadVariableHistory();
  }, [loadEnvironments, loadGlobalVariables, loadVariableHistory]);

  // 创建新环境
  const handleCreateEnvironment = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/environments`, newEnvironment);
      showMessage('环境创建成功', 'success');
      setCreateDialogOpen(false);
      setNewEnvironment({ name: '', description: '', baseUrl: '', variables: [] });
      loadEnvironments();
    } catch (error) {
      console.error('创建环境失败:', error);
      showMessage('创建环境失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 激活环境
  const handleActivateEnvironment = async (environmentId) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/environments/${environmentId}/activate`);
      setActiveEnvironment(response.data.data);
      showMessage(response.data.message, 'success');
      loadEnvironments();
    } catch (error) {
      console.error('激活环境失败:', error);
      showMessage('激活环境失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 删除环境
  const handleDeleteEnvironment = async (environmentId) => {
    if (!window.confirm('确定要删除这个环境吗？')) return;
    
    try {
      setLoading(true);
      await axios.delete(`${API_BASE_URL}/environments/${environmentId}`);
      showMessage('环境已删除', 'success');
      loadEnvironments();
      
      if (selectedEnvironment?.id === environmentId) {
        setSelectedEnvironment(null);
      }
    } catch (error) {
      console.error('删除环境失败:', error);
      showMessage('删除环境失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 添加变量
  const handleAddVariable = async () => {
    if (!selectedEnvironment) return;
    
    try {
      setLoading(true);
      await axios.post(`${API_BASE_URL}/environments/${selectedEnvironment.id}/variables`, newVariable);
      showMessage(`变量 ${newVariable.key} 已添加`, 'success');
      setVariableDialogOpen(false);
      setNewVariable({ key: '', value: '', type: 'text', description: '', secret: false });
      
      // 重新加载选中的环境
      const response = await axios.get(`${API_BASE_URL}/environments/${selectedEnvironment.id}`);
      setSelectedEnvironment(response.data.data);
    } catch (error) {
      console.error('添加变量失败:', error);
      showMessage('添加变量失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 添加全局变量
  const handleAddGlobalVariable = async () => {
    try {
      setLoading(true);
      await axios.post(`${API_BASE_URL}/environments/global/variables`, newVariable);
      showMessage(`全局变量 ${newVariable.key} 已添加`, 'success');
      setVariableDialogOpen(false);
      setNewVariable({ key: '', value: '', type: 'text', description: '', secret: false });
      loadGlobalVariables();
    } catch (error) {
      console.error('添加全局变量失败:', error);
      showMessage('添加全局变量失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 导出环境
  const handleExportEnvironment = async (environmentId, format = 'testweb') => {
    try {
      const response = await axios.get(`${API_BASE_URL}/environments/${environmentId}/export?format=${format}`);
      const data = response.data.data;
      
      // 创建下载链接
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `environment-${data.name}-${format}.json`;
      link.click();
      
      showMessage('环境导出成功', 'success');
    } catch (error) {
      console.error('导出环境失败:', error);
      showMessage('导出环境失败', 'error');
    }
  };

  // 导入环境
  const handleImportEnvironment = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      setLoading(true);
      await axios.post(`${API_BASE_URL}/environments/import`, data);
      showMessage('环境导入成功', 'success');
      setImportDialogOpen(false);
      loadEnvironments();
    } catch (error) {
      console.error('导入环境失败:', error);
      showMessage('导入环境失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 复制变量值
  const handleCopyVariable = (value) => {
    navigator.clipboard.writeText(value);
    showMessage('已复制到剪贴板', 'info');
  };

  // 切换密钥显示
  const toggleSecretVisibility = (variableKey) => {
    setShowSecrets(prev => ({
      ...prev,
      [variableKey]: !prev[variableKey]
    }));
  };

  // 切换展开/折叠
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // 显示消息
  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: 'info' }), 3000);
  };

  // 渲染环境列表
  const renderEnvironmentList = () => (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">环境列表</Typography>
        <Box>
          <Tooltip title="导入环境">
            <IconButton onClick={() => setImportDialogOpen(true)} size="small">
              <UploadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="刷新列表">
            <IconButton onClick={loadEnvironments} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            size="small"
            onClick={() => setCreateDialogOpen(true)}
          >
            新建环境
          </Button>
        </Box>
      </Box>

      <List>
        {environments.map(env => (
          <ListItem
            key={env.id}
            button
            selected={selectedEnvironment?.id === env.id}
            onClick={() => setSelectedEnvironment(env)}
            secondaryAction={
              <Box>
                {env.isActive && (
                  <Chip label="活跃" size="small" color="success" sx={{ mr: 1 }} />
                )}
                <Tooltip title="设为活跃环境">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleActivateEnvironment(env.id);
                    }}
                  >
                    {env.isActive ? <StarIcon color="primary" /> : <StarBorderIcon />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="导出环境">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportEnvironment(env.id);
                    }}
                  >
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="删除环境">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteEnvironment(env.id);
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            }
          >
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: env.color || '#ccc'
                    }}
                  />
                  <Typography>{env.name}</Typography>
                  <Chip label={`${env.variableCount} 变量`} size="small" variant="outlined" />
                </Box>
              }
              secondary={env.description}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  // 渲染变量表格
  const renderVariablesTable = (variables, isGlobal = false) => (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>变量名</TableCell>
            <TableCell>值</TableCell>
            <TableCell>类型</TableCell>
            <TableCell>描述</TableCell>
            <TableCell align="center">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {variables.map((variable, index) => (
            <TableRow key={`${variable.key}-${index}`}>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="body2" fontFamily="monospace">
                    {variable.key}
                  </Typography>
                  {variable.secret && <LockIcon fontSize="small" color="action" />}
                </Box>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {variable.secret && !showSecrets[variable.key] ? (
                    <Typography variant="body2" fontFamily="monospace">
                      ••••••••
                    </Typography>
                  ) : (
                    <Typography
                      variant="body2"
                      fontFamily="monospace"
                      sx={{
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {variable.value || variable.encrypted ? '[ENCRYPTED]' : ''}
                    </Typography>
                  )}
                  {variable.secret && (
                    <IconButton
                      size="small"
                      onClick={() => toggleSecretVisibility(variable.key)}
                    >
                      {showSecrets[variable.key] ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  )}
                </Box>
              </TableCell>
              <TableCell>
                <Chip label={variable.type} size="small" variant="outlined" />
              </TableCell>
              <TableCell>
                <Typography variant="body2">{variable.description}</Typography>
              </TableCell>
              <TableCell align="center">
                <Tooltip title="复制值">
                  <IconButton
                    size="small"
                    onClick={() => handleCopyVariable(variable.value)}
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="编辑">
                  <IconButton size="small">
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="删除">
                  <IconButton size="small" color="error">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // 渲染动态变量帮助
  const renderDynamicVariables = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        动态变量
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        动态变量在每次使用时都会生成新的值。在请求中使用 {'{{$variableName}}'} 格式引用。
      </Typography>
      <Grid container spacing={2}>
        {dynamicVariables.map(dv => (
          <Grid item xs={12} sm={6} md={4} key={dv.key}>
            <Card variant="outlined">
              <CardContent sx={{ py: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CodeIcon fontSize="small" color="primary" />
                  <Typography variant="body2" fontFamily="monospace">
                    {dv.key}
                  </Typography>
                </Box>
                <Typography variant="caption" color="textSecondary">
                  {dv.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 消息提示 */}
      {message.text && (
        <Alert severity={message.type} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

      {/* 主标题 */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5">环境变量管理</Typography>
        <Typography variant="body2" color="textSecondary">
          管理API请求的环境变量和全局配置
        </Typography>
      </Box>

      {/* 标签页 */}
      <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="环境" icon={<LocationOnIcon />} iconPosition="start" />
        <Tab label="全局变量" icon={<GlobalIcon />} iconPosition="start" />
        <Tab label="动态变量" icon={<RefreshIcon />} iconPosition="start" />
        <Tab label="历史记录" icon={<HistoryIcon />} iconPosition="start" />
      </Tabs>

      {/* 标签内容 */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {/* 环境标签 */}
        {tabValue === 0 && (
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              {renderEnvironmentList()}
            </Grid>
            <Grid item xs={12} md={8}>
              {selectedEnvironment ? (
                <Box>
                  <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">{selectedEnvironment.name}</Typography>
                    <Button
                      startIcon={<AddIcon />}
                      variant="outlined"
                      size="small"
                      onClick={() => setVariableDialogOpen(true)}
                    >
                      添加变量
                    </Button>
                  </Box>
                  {selectedEnvironment.variables && selectedEnvironment.variables.length > 0 ? (
                    renderVariablesTable(selectedEnvironment.variables)
                  ) : (
                    <Alert severity="info">该环境还没有变量</Alert>
                  )}
                </Box>
              ) : (
                <Alert severity="info">请选择一个环境查看详情</Alert>
              )}
            </Grid>
          </Grid>
        )}

        {/* 全局变量标签 */}
        {tabValue === 1 && (
          <Box>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">全局变量</Typography>
              <Button
                startIcon={<AddIcon />}
                variant="outlined"
                size="small"
                onClick={() => setVariableDialogOpen(true)}
              >
                添加全局变量
              </Button>
            </Box>
            {globalVariables.length > 0 ? (
              renderVariablesTable(globalVariables, true)
            ) : (
              <Alert severity="info">还没有全局变量</Alert>
            )}
          </Box>
        )}

        {/* 动态变量标签 */}
        {tabValue === 2 && renderDynamicVariables()}

        {/* 历史记录标签 */}
        {tabValue === 3 && (
          <Box>
            <Typography variant="h6" gutterBottom>变量变更历史</Typography>
            {variableHistory.length > 0 ? (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>时间</TableCell>
                      <TableCell>类型</TableCell>
                      <TableCell>变量/环境</TableCell>
                      <TableCell>值</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {variableHistory.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {new Date(item.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={item.type === 'environment_switch' ? '环境切换' : '变量变更'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          {item.type === 'environment_switch' ? 
                            item.environmentName : 
                            item.key
                          }
                        </TableCell>
                        <TableCell>
                          {item.type === 'variable_change' && item.value}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">没有历史记录</Alert>
            )}
          </Box>
        )}
      </Box>

      {/* 创建环境对话框 */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>创建新环境</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="环境名称"
              value={newEnvironment.name}
              onChange={(e) => setNewEnvironment({ ...newEnvironment, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="描述"
              value={newEnvironment.description}
              onChange={(e) => setNewEnvironment({ ...newEnvironment, description: e.target.value })}
              margin="normal"
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              label="基础URL"
              value={newEnvironment.baseUrl}
              onChange={(e) => setNewEnvironment({ ...newEnvironment, baseUrl: e.target.value })}
              margin="normal"
              placeholder="https://api.example.com"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button onClick={handleCreateEnvironment} variant="contained" disabled={!newEnvironment.name || loading}>
            创建
          </Button>
        </DialogActions>
      </Dialog>

      {/* 添加变量对话框 */}
      <Dialog open={variableDialogOpen} onClose={() => setVariableDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {tabValue === 1 ? '添加全局变量' : '添加环境变量'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="变量名"
              value={newVariable.key}
              onChange={(e) => setNewVariable({ ...newVariable, key: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="值"
              value={newVariable.value}
              onChange={(e) => setNewVariable({ ...newVariable, value: e.target.value })}
              margin="normal"
              type={newVariable.secret ? 'password' : 'text'}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>类型</InputLabel>
              <Select
                value={newVariable.type}
                onChange={(e) => setNewVariable({ ...newVariable, type: e.target.value })}
                label="类型"
              >
                <MenuItem value="text">文本</MenuItem>
                <MenuItem value="number">数字</MenuItem>
                <MenuItem value="boolean">布尔值</MenuItem>
                <MenuItem value="json">JSON</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="描述"
              value={newVariable.description}
              onChange={(e) => setNewVariable({ ...newVariable, description: e.target.value })}
              margin="normal"
              multiline
              rows={2}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={newVariable.secret}
                  onChange={(e) => setNewVariable({ ...newVariable, secret: e.target.checked })}
                />
              }
              label="敏感变量（加密存储）"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVariableDialogOpen(false)}>取消</Button>
          <Button
            onClick={tabValue === 1 ? handleAddGlobalVariable : handleAddVariable}
            variant="contained"
            disabled={!newVariable.key || loading}
          >
            添加
          </Button>
        </DialogActions>
      </Dialog>

      {/* 导入对话框 */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>导入环境</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" paragraph>
              支持导入Test-Web或Postman格式的环境文件
            </Typography>
            <Button
              variant="contained"
              component="label"
              fullWidth
              startIcon={<UploadIcon />}
            >
              选择文件
              <input
                type="file"
                hidden
                accept=".json"
                onChange={handleImportEnvironment}
              />
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>取消</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnvironmentManager;
