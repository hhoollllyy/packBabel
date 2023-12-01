let astGlb = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof globalThis !== 'undefined' ? globalThis : this;
astGlb.babel = astGlb.babel || {};
if (!astGlb.babel.parse) astGlb.babel.parse = require("@babel/parser");
