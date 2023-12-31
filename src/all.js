const generator = require("@babel/generator").default;
const parser = require("@babel/parser");
const template = require("@babel/template");
const traverse = require("@babel/traverse").default;
const types = require("@babel/types");
let astGlb = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof globalThis !== 'undefined' ? globalThis : this;
astGlb.babel = astGlb.babel || {};
astGlb.babel.generator = generator;
astGlb.babel.parser = parser;
astGlb.babel.template = template;
astGlb.babel.traverse = traverse;
astGlb.babel.types = types;