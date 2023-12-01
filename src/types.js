let astGlb = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof globalThis !== 'undefined' ? globalThis : this;
astGlb.babel = astGlb.babel || {};
if (!astGlb.babel.types) astGlb.babel.types = require("@babel/types");