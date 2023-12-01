/*
 * @Author       : Holly
 * @Date         : 2023-12-02 00:47:23
 * @LastEditors  : Holly
 * @LastEditTime : 2023-12-02 05:23:39
 * @Description  : 
 * @FilePath     : /src/all.js
 */
const generate = require("@babel/generator").default;
const parser = require("@babel/parser");
const template = require("@babel/template");
const traverse = require("@babel/traverse").default;
const types = require("@babel/types");
let astGlb = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof globalThis !== 'undefined' ? globalThis : this;
astGlb.babel = astGlb.babel || {};
astGlb.babel.generate = generate;
astGlb.babel.parser = parser;
astGlb.babel.template = template;
astGlb.babel.traverse = traverse;
astGlb.babel.types = types;