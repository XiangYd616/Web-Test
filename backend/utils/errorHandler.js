/**
 * 错误处理器
 */

const errorHandler = {
  handle: (error, req, res, next) => {
    console.error('Error:', error);

    if (res.headersSent) {
      
        return next(error);
      }

    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  },

  log: (error) => {
    console.error('Error logged:', error);
  }
};

module.exports = errorHandler;
