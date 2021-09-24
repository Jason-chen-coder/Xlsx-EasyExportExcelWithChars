const path = require('path');
const resolve = (dir) => {
  return path.join(__dirname, dir);
};
module.exports = {
   publicPath: process.env.NODE_ENV === 'production'
    ? '/Xlsx-EasyExportExcelWithChars/'
    : '/',
  lintOnSave: false,
  productionSourceMap: false,
  configureWebpack: {
    resolve: {
      alias: {
        '@': resolve('examples'),
        'edsp-gw': resolve('packages'),
      },
    },
  },
  devServer: {
    overlay: {
      warnings: false,
      errors: false,
    },
    proxy: {
      '/xslx': {   // 路径中有 /api 的请求都会走这个代理 , 可以自己定义一个,下面移除即可
        target: 'http:/localhost:4399/xslxchart',    // 目标代理接口地址,实际跨域要访问的接口,这个地址会替换掉 axios.defaults.baseURL
        changeOrigin: true,  // 开启代理，在本地创建一个虚拟服务端
        pathRewrite: {   // 去掉 路径中的  /api  的这一截
          '^/xslx': '',
        },
      }
    },
  }
}
