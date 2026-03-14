const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const Dotenv = require('dotenv-webpack');

module.exports = {
  entry: './src/main.ts',
  module: {
    rules: [{
      test: /\.tsx?$/,
      use: 'ts-loader',
      exclude: /node_modules/,
    }],
  },
  resolve: { extensions: ['.tsx', '.ts', '.js'] },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './src/index.html' }),
    new Dotenv({ safe: false, silent: true }),
  ],
  devServer: {
    static: './dist',
    port: 3000,
    hot: true,
  },
};
