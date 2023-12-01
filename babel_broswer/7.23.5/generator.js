(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
class Buffer {
  constructor(map, indentChar) {
    this._map = null;
    this._buf = "";
    this._str = "";
    this._appendCount = 0;
    this._last = 0;
    this._queue = [];
    this._queueCursor = 0;
    this._canMarkIdName = true;
    this._indentChar = "";
    this._fastIndentations = [];
    this._position = {
      line: 1,
      column: 0
    };
    this._sourcePosition = {
      identifierName: undefined,
      identifierNamePos: undefined,
      line: undefined,
      column: undefined,
      filename: undefined
    };
    this._map = map;
    this._indentChar = indentChar;
    for (let i = 0; i < 64; i++) {
      this._fastIndentations.push(indentChar.repeat(i));
    }
    this._allocQueue();
  }
  _allocQueue() {
    const queue = this._queue;
    for (let i = 0; i < 16; i++) {
      queue.push({
        char: 0,
        repeat: 1,
        line: undefined,
        column: undefined,
        identifierName: undefined,
        identifierNamePos: undefined,
        filename: ""
      });
    }
  }
  _pushQueue(char, repeat, line, column, filename) {
    const cursor = this._queueCursor;
    if (cursor === this._queue.length) {
      this._allocQueue();
    }
    const item = this._queue[cursor];
    item.char = char;
    item.repeat = repeat;
    item.line = line;
    item.column = column;
    item.filename = filename;
    this._queueCursor++;
  }
  _popQueue() {
    if (this._queueCursor === 0) {
      throw new Error("Cannot pop from empty queue");
    }
    return this._queue[--this._queueCursor];
  }
  get() {
    this._flush();
    const map = this._map;
    const result = {
      code: (this._buf + this._str).trimRight(),
      decodedMap: map == null ? void 0 : map.getDecoded(),
      get __mergedMap() {
        return this.map;
      },
      get map() {
        const resultMap = map ? map.get() : null;
        result.map = resultMap;
        return resultMap;
      },
      set map(value) {
        Object.defineProperty(result, "map", {
          value,
          writable: true
        });
      },
      get rawMappings() {
        const mappings = map == null ? void 0 : map.getRawMappings();
        result.rawMappings = mappings;
        return mappings;
      },
      set rawMappings(value) {
        Object.defineProperty(result, "rawMappings", {
          value,
          writable: true
        });
      }
    };
    return result;
  }
  append(str, maybeNewline) {
    this._flush();
    this._append(str, this._sourcePosition, maybeNewline);
  }
  appendChar(char) {
    this._flush();
    this._appendChar(char, 1, this._sourcePosition);
  }
  queue(char) {
    if (char === 10) {
      while (this._queueCursor !== 0) {
        const char = this._queue[this._queueCursor - 1].char;
        if (char !== 32 && char !== 9) {
          break;
        }
        this._queueCursor--;
      }
    }
    const sourcePosition = this._sourcePosition;
    this._pushQueue(char, 1, sourcePosition.line, sourcePosition.column, sourcePosition.filename);
  }
  queueIndentation(repeat) {
    if (repeat === 0) return;
    this._pushQueue(-1, repeat, undefined, undefined, undefined);
  }
  _flush() {
    const queueCursor = this._queueCursor;
    const queue = this._queue;
    for (let i = 0; i < queueCursor; i++) {
      const item = queue[i];
      this._appendChar(item.char, item.repeat, item);
    }
    this._queueCursor = 0;
  }
  _appendChar(char, repeat, sourcePos) {
    this._last = char;
    if (char === -1) {
      const fastIndentation = this._fastIndentations[repeat];
      if (fastIndentation !== undefined) {
        this._str += fastIndentation;
      } else {
        this._str += repeat > 1 ? this._indentChar.repeat(repeat) : this._indentChar;
      }
    } else {
      this._str += repeat > 1 ? String.fromCharCode(char).repeat(repeat) : String.fromCharCode(char);
    }
    if (char !== 10) {
      this._mark(sourcePos.line, sourcePos.column, sourcePos.identifierName, sourcePos.identifierNamePos, sourcePos.filename);
      this._position.column += repeat;
    } else {
      this._position.line++;
      this._position.column = 0;
    }
    if (this._canMarkIdName) {
      sourcePos.identifierName = undefined;
      sourcePos.identifierNamePos = undefined;
    }
  }
  _append(str, sourcePos, maybeNewline) {
    const len = str.length;
    const position = this._position;
    this._last = str.charCodeAt(len - 1);
    if (++this._appendCount > 4096) {
      +this._str;
      this._buf += this._str;
      this._str = str;
      this._appendCount = 0;
    } else {
      this._str += str;
    }
    if (!maybeNewline && !this._map) {
      position.column += len;
      return;
    }
    const {
      column,
      identifierName,
      identifierNamePos,
      filename
    } = sourcePos;
    let line = sourcePos.line;
    if ((identifierName != null || identifierNamePos != null) && this._canMarkIdName) {
      sourcePos.identifierName = undefined;
      sourcePos.identifierNamePos = undefined;
    }
    let i = str.indexOf("\n");
    let last = 0;
    if (i !== 0) {
      this._mark(line, column, identifierName, identifierNamePos, filename);
    }
    while (i !== -1) {
      position.line++;
      position.column = 0;
      last = i + 1;
      if (last < len && line !== undefined) {
        this._mark(++line, 0, null, null, filename);
      }
      i = str.indexOf("\n", last);
    }
    position.column += len - last;
  }
  _mark(line, column, identifierName, identifierNamePos, filename) {
    var _this$_map;
    (_this$_map = this._map) == null || _this$_map.mark(this._position, line, column, identifierName, identifierNamePos, filename);
  }
  removeTrailingNewline() {
    const queueCursor = this._queueCursor;
    if (queueCursor !== 0 && this._queue[queueCursor - 1].char === 10) {
      this._queueCursor--;
    }
  }
  removeLastSemicolon() {
    const queueCursor = this._queueCursor;
    if (queueCursor !== 0 && this._queue[queueCursor - 1].char === 59) {
      this._queueCursor--;
    }
  }
  getLastChar() {
    const queueCursor = this._queueCursor;
    return queueCursor !== 0 ? this._queue[queueCursor - 1].char : this._last;
  }
  getNewlineCount() {
    const queueCursor = this._queueCursor;
    let count = 0;
    if (queueCursor === 0) return this._last === 10 ? 1 : 0;
    for (let i = queueCursor - 1; i >= 0; i--) {
      if (this._queue[i].char !== 10) {
        break;
      }
      count++;
    }
    return count === queueCursor && this._last === 10 ? count + 1 : count;
  }
  endsWithCharAndNewline() {
    const queue = this._queue;
    const queueCursor = this._queueCursor;
    if (queueCursor !== 0) {
      const lastCp = queue[queueCursor - 1].char;
      if (lastCp !== 10) return;
      if (queueCursor > 1) {
        return queue[queueCursor - 2].char;
      } else {
        return this._last;
      }
    }
  }
  hasContent() {
    return this._queueCursor !== 0 || !!this._last;
  }
  exactSource(loc, cb) {
    if (!this._map) {
      cb();
      return;
    }
    this.source("start", loc);
    const identifierName = loc.identifierName;
    const sourcePos = this._sourcePosition;
    if (identifierName) {
      this._canMarkIdName = false;
      sourcePos.identifierName = identifierName;
    }
    cb();
    if (identifierName) {
      this._canMarkIdName = true;
      sourcePos.identifierName = undefined;
      sourcePos.identifierNamePos = undefined;
    }
    this.source("end", loc);
  }
  source(prop, loc) {
    if (!this._map) return;
    this._normalizePosition(prop, loc, 0);
  }
  sourceWithOffset(prop, loc, columnOffset) {
    if (!this._map) return;
    this._normalizePosition(prop, loc, columnOffset);
  }
  withSource(prop, loc, cb) {
    if (this._map) {
      this.source(prop, loc);
    }
    cb();
  }
  _normalizePosition(prop, loc, columnOffset) {
    const pos = loc[prop];
    const target = this._sourcePosition;
    if (pos) {
      target.line = pos.line;
      target.column = Math.max(pos.column + columnOffset, 0);
      target.filename = loc.filename;
    }
  }
  getCurrentColumn() {
    const queue = this._queue;
    const queueCursor = this._queueCursor;
    let lastIndex = -1;
    let len = 0;
    for (let i = 0; i < queueCursor; i++) {
      const item = queue[i];
      if (item.char === 10) {
        lastIndex = len;
      }
      len += item.repeat;
    }
    return lastIndex === -1 ? this._position.column + len : len - 1 - lastIndex;
  }
  getCurrentLine() {
    let count = 0;
    const queue = this._queue;
    for (let i = 0; i < this._queueCursor; i++) {
      if (queue[i].char === 10) {
        count++;
      }
    }
    return this._position.line + count;
  }
}
exports.default = Buffer;



},{}],2:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BlockStatement = BlockStatement;
exports.Directive = Directive;
exports.DirectiveLiteral = DirectiveLiteral;
exports.File = File;
exports.InterpreterDirective = InterpreterDirective;
exports.Placeholder = Placeholder;
exports.Program = Program;
function File(node) {
  if (node.program) {
    this.print(node.program.interpreter, node);
  }
  this.print(node.program, node);
}
function Program(node) {
  var _node$directives;
  this.noIndentInnerCommentsHere();
  this.printInnerComments();
  const directivesLen = (_node$directives = node.directives) == null ? void 0 : _node$directives.length;
  if (directivesLen) {
    var _node$directives$trai;
    const newline = node.body.length ? 2 : 1;
    this.printSequence(node.directives, node, {
      trailingCommentsLineOffset: newline
    });
    if (!((_node$directives$trai = node.directives[directivesLen - 1].trailingComments) != null && _node$directives$trai.length)) {
      this.newline(newline);
    }
  }
  this.printSequence(node.body, node);
}
function BlockStatement(node) {
  var _node$directives2;
  this.tokenChar(123);
  const directivesLen = (_node$directives2 = node.directives) == null ? void 0 : _node$directives2.length;
  if (directivesLen) {
    var _node$directives$trai2;
    const newline = node.body.length ? 2 : 1;
    this.printSequence(node.directives, node, {
      indent: true,
      trailingCommentsLineOffset: newline
    });
    if (!((_node$directives$trai2 = node.directives[directivesLen - 1].trailingComments) != null && _node$directives$trai2.length)) {
      this.newline(newline);
    }
  }
  this.printSequence(node.body, node, {
    indent: true
  });
  this.rightBrace(node);
}
function Directive(node) {
  this.print(node.value, node);
  this.semicolon();
}
const unescapedSingleQuoteRE = /(?:^|[^\\])(?:\\\\)*'/;
const unescapedDoubleQuoteRE = /(?:^|[^\\])(?:\\\\)*"/;
function DirectiveLiteral(node) {
  const raw = this.getPossibleRaw(node);
  if (!this.format.minified && raw !== undefined) {
    this.token(raw);
    return;
  }
  const {
    value
  } = node;
  if (!unescapedDoubleQuoteRE.test(value)) {
    this.token(`"${value}"`);
  } else if (!unescapedSingleQuoteRE.test(value)) {
    this.token(`'${value}'`);
  } else {
    throw new Error("Malformed AST: it is not possible to print a directive containing" + " both unescaped single and double quotes.");
  }
}
function InterpreterDirective(node) {
  this.token(`#!${node.value}`);
  this.newline(1, true);
}
function Placeholder(node) {
  this.token("%%");
  this.print(node.name);
  this.token("%%");
  if (node.expectedNode === "Statement") {
    this.semicolon();
  }
}



},{}],3:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ClassAccessorProperty = ClassAccessorProperty;
exports.ClassBody = ClassBody;
exports.ClassExpression = exports.ClassDeclaration = ClassDeclaration;
exports.ClassMethod = ClassMethod;
exports.ClassPrivateMethod = ClassPrivateMethod;
exports.ClassPrivateProperty = ClassPrivateProperty;
exports.ClassProperty = ClassProperty;
exports.StaticBlock = StaticBlock;
exports._classMethodHead = _classMethodHead;
var _t = require("@babel/types");
const {
  isExportDefaultDeclaration,
  isExportNamedDeclaration
} = _t;
function ClassDeclaration(node, parent) {
  const inExport = isExportDefaultDeclaration(parent) || isExportNamedDeclaration(parent);
  if (!inExport || !this._shouldPrintDecoratorsBeforeExport(parent)) {
    this.printJoin(node.decorators, node);
  }
  if (node.declare) {
    this.word("declare");
    this.space();
  }
  if (node.abstract) {
    this.word("abstract");
    this.space();
  }
  this.word("class");
  if (node.id) {
    this.space();
    this.print(node.id, node);
  }
  this.print(node.typeParameters, node);
  if (node.superClass) {
    this.space();
    this.word("extends");
    this.space();
    this.print(node.superClass, node);
    this.print(node.superTypeParameters, node);
  }
  if (node.implements) {
    this.space();
    this.word("implements");
    this.space();
    this.printList(node.implements, node);
  }
  this.space();
  this.print(node.body, node);
}
function ClassBody(node) {
  this.tokenChar(123);
  if (node.body.length === 0) {
    this.tokenChar(125);
  } else {
    this.newline();
    this.printSequence(node.body, node, {
      indent: true
    });
    if (!this.endsWith(10)) this.newline();
    this.rightBrace(node);
  }
}
function ClassProperty(node) {
  var _node$key$loc;
  this.printJoin(node.decorators, node);
  const endLine = (_node$key$loc = node.key.loc) == null || (_node$key$loc = _node$key$loc.end) == null ? void 0 : _node$key$loc.line;
  if (endLine) this.catchUp(endLine);
  this.tsPrintClassMemberModifiers(node);
  if (node.computed) {
    this.tokenChar(91);
    this.print(node.key, node);
    this.tokenChar(93);
  } else {
    this._variance(node);
    this.print(node.key, node);
  }
  if (node.optional) {
    this.tokenChar(63);
  }
  if (node.definite) {
    this.tokenChar(33);
  }
  this.print(node.typeAnnotation, node);
  if (node.value) {
    this.space();
    this.tokenChar(61);
    this.space();
    this.print(node.value, node);
  }
  this.semicolon();
}
function ClassAccessorProperty(node) {
  var _node$key$loc2;
  this.printJoin(node.decorators, node);
  const endLine = (_node$key$loc2 = node.key.loc) == null || (_node$key$loc2 = _node$key$loc2.end) == null ? void 0 : _node$key$loc2.line;
  if (endLine) this.catchUp(endLine);
  this.tsPrintClassMemberModifiers(node);
  this.word("accessor", true);
  this.space();
  if (node.computed) {
    this.tokenChar(91);
    this.print(node.key, node);
    this.tokenChar(93);
  } else {
    this._variance(node);
    this.print(node.key, node);
  }
  if (node.optional) {
    this.tokenChar(63);
  }
  if (node.definite) {
    this.tokenChar(33);
  }
  this.print(node.typeAnnotation, node);
  if (node.value) {
    this.space();
    this.tokenChar(61);
    this.space();
    this.print(node.value, node);
  }
  this.semicolon();
}
function ClassPrivateProperty(node) {
  this.printJoin(node.decorators, node);
  if (node.static) {
    this.word("static");
    this.space();
  }
  this.print(node.key, node);
  this.print(node.typeAnnotation, node);
  if (node.value) {
    this.space();
    this.tokenChar(61);
    this.space();
    this.print(node.value, node);
  }
  this.semicolon();
}
function ClassMethod(node) {
  this._classMethodHead(node);
  this.space();
  this.print(node.body, node);
}
function ClassPrivateMethod(node) {
  this._classMethodHead(node);
  this.space();
  this.print(node.body, node);
}
function _classMethodHead(node) {
  var _node$key$loc3;
  this.printJoin(node.decorators, node);
  const endLine = (_node$key$loc3 = node.key.loc) == null || (_node$key$loc3 = _node$key$loc3.end) == null ? void 0 : _node$key$loc3.line;
  if (endLine) this.catchUp(endLine);
  this.tsPrintClassMemberModifiers(node);
  this._methodHead(node);
}
function StaticBlock(node) {
  this.word("static");
  this.space();
  this.tokenChar(123);
  if (node.body.length === 0) {
    this.tokenChar(125);
  } else {
    this.newline();
    this.printSequence(node.body, node, {
      indent: true
    });
    this.rightBrace(node);
  }
}



},{"@babel/types":69}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LogicalExpression = exports.BinaryExpression = exports.AssignmentExpression = AssignmentExpression;
exports.AssignmentPattern = AssignmentPattern;
exports.AwaitExpression = AwaitExpression;
exports.BindExpression = BindExpression;
exports.CallExpression = CallExpression;
exports.ConditionalExpression = ConditionalExpression;
exports.Decorator = Decorator;
exports.DoExpression = DoExpression;
exports.EmptyStatement = EmptyStatement;
exports.ExpressionStatement = ExpressionStatement;
exports.Import = Import;
exports.MemberExpression = MemberExpression;
exports.MetaProperty = MetaProperty;
exports.ModuleExpression = ModuleExpression;
exports.NewExpression = NewExpression;
exports.OptionalCallExpression = OptionalCallExpression;
exports.OptionalMemberExpression = OptionalMemberExpression;
exports.ParenthesizedExpression = ParenthesizedExpression;
exports.PrivateName = PrivateName;
exports.SequenceExpression = SequenceExpression;
exports.Super = Super;
exports.ThisExpression = ThisExpression;
exports.UnaryExpression = UnaryExpression;
exports.UpdateExpression = UpdateExpression;
exports.V8IntrinsicIdentifier = V8IntrinsicIdentifier;
exports.YieldExpression = YieldExpression;
exports._shouldPrintDecoratorsBeforeExport = _shouldPrintDecoratorsBeforeExport;
var _t = require("@babel/types");
var n = require("../node/index.js");
const {
  isCallExpression,
  isLiteral,
  isMemberExpression,
  isNewExpression
} = _t;
function UnaryExpression(node) {
  const {
    operator
  } = node;
  if (operator === "void" || operator === "delete" || operator === "typeof" || operator === "throw") {
    this.word(operator);
    this.space();
  } else {
    this.token(operator);
  }
  this.print(node.argument, node);
}
function DoExpression(node) {
  if (node.async) {
    this.word("async", true);
    this.space();
  }
  this.word("do");
  this.space();
  this.print(node.body, node);
}
function ParenthesizedExpression(node) {
  this.tokenChar(40);
  this.print(node.expression, node);
  this.rightParens(node);
}
function UpdateExpression(node) {
  if (node.prefix) {
    this.token(node.operator);
    this.print(node.argument, node);
  } else {
    this.printTerminatorless(node.argument, node, true);
    this.token(node.operator);
  }
}
function ConditionalExpression(node) {
  this.print(node.test, node);
  this.space();
  this.tokenChar(63);
  this.space();
  this.print(node.consequent, node);
  this.space();
  this.tokenChar(58);
  this.space();
  this.print(node.alternate, node);
}
function NewExpression(node, parent) {
  this.word("new");
  this.space();
  this.print(node.callee, node);
  if (this.format.minified && node.arguments.length === 0 && !node.optional && !isCallExpression(parent, {
    callee: node
  }) && !isMemberExpression(parent) && !isNewExpression(parent)) {
    return;
  }
  this.print(node.typeArguments, node);
  this.print(node.typeParameters, node);
  if (node.optional) {
    this.token("?.");
  }
  this.tokenChar(40);
  this.printList(node.arguments, node);
  this.rightParens(node);
}
function SequenceExpression(node) {
  this.printList(node.expressions, node);
}
function ThisExpression() {
  this.word("this");
}
function Super() {
  this.word("super");
}
function isDecoratorMemberExpression(node) {
  switch (node.type) {
    case "Identifier":
      return true;
    case "MemberExpression":
      return !node.computed && node.property.type === "Identifier" && isDecoratorMemberExpression(node.object);
    default:
      return false;
  }
}
function shouldParenthesizeDecoratorExpression(node) {
  if (node.type === "ParenthesizedExpression") {
    return false;
  }
  return !isDecoratorMemberExpression(node.type === "CallExpression" ? node.callee : node);
}
function _shouldPrintDecoratorsBeforeExport(node) {
  if (typeof this.format.decoratorsBeforeExport === "boolean") {
    return this.format.decoratorsBeforeExport;
  }
  return typeof node.start === "number" && node.start === node.declaration.start;
}
function Decorator(node) {
  this.tokenChar(64);
  const {
    expression
  } = node;
  if (shouldParenthesizeDecoratorExpression(expression)) {
    this.tokenChar(40);
    this.print(expression, node);
    this.tokenChar(41);
  } else {
    this.print(expression, node);
  }
  this.newline();
}
function OptionalMemberExpression(node) {
  let {
    computed
  } = node;
  const {
    optional,
    property
  } = node;
  this.print(node.object, node);
  if (!computed && isMemberExpression(property)) {
    throw new TypeError("Got a MemberExpression for MemberExpression property");
  }
  if (isLiteral(property) && typeof property.value === "number") {
    computed = true;
  }
  if (optional) {
    this.token("?.");
  }
  if (computed) {
    this.tokenChar(91);
    this.print(property, node);
    this.tokenChar(93);
  } else {
    if (!optional) {
      this.tokenChar(46);
    }
    this.print(property, node);
  }
}
function OptionalCallExpression(node) {
  this.print(node.callee, node);
  this.print(node.typeParameters, node);
  if (node.optional) {
    this.token("?.");
  }
  this.print(node.typeArguments, node);
  this.tokenChar(40);
  this.printList(node.arguments, node);
  this.rightParens(node);
}
function CallExpression(node) {
  this.print(node.callee, node);
  this.print(node.typeArguments, node);
  this.print(node.typeParameters, node);
  this.tokenChar(40);
  this.printList(node.arguments, node);
  this.rightParens(node);
}
function Import() {
  this.word("import");
}
function AwaitExpression(node) {
  this.word("await");
  if (node.argument) {
    this.space();
    this.printTerminatorless(node.argument, node, false);
  }
}
function YieldExpression(node) {
  this.word("yield", true);
  if (node.delegate) {
    this.tokenChar(42);
    if (node.argument) {
      this.space();
      this.print(node.argument, node);
    }
  } else {
    if (node.argument) {
      this.space();
      this.printTerminatorless(node.argument, node, false);
    }
  }
}
function EmptyStatement() {
  this.semicolon(true);
}
function ExpressionStatement(node) {
  this.print(node.expression, node);
  this.semicolon();
}
function AssignmentPattern(node) {
  this.print(node.left, node);
  if (node.left.optional) this.tokenChar(63);
  this.print(node.left.typeAnnotation, node);
  this.space();
  this.tokenChar(61);
  this.space();
  this.print(node.right, node);
}
function AssignmentExpression(node, parent) {
  const parens = this.inForStatementInitCounter && node.operator === "in" && !n.needsParens(node, parent);
  if (parens) {
    this.tokenChar(40);
  }
  this.print(node.left, node);
  this.space();
  if (node.operator === "in" || node.operator === "instanceof") {
    this.word(node.operator);
  } else {
    this.token(node.operator);
  }
  this.space();
  this.print(node.right, node);
  if (parens) {
    this.tokenChar(41);
  }
}
function BindExpression(node) {
  this.print(node.object, node);
  this.token("::");
  this.print(node.callee, node);
}
function MemberExpression(node) {
  this.print(node.object, node);
  if (!node.computed && isMemberExpression(node.property)) {
    throw new TypeError("Got a MemberExpression for MemberExpression property");
  }
  let computed = node.computed;
  if (isLiteral(node.property) && typeof node.property.value === "number") {
    computed = true;
  }
  if (computed) {
    this.tokenChar(91);
    this.print(node.property, node);
    this.tokenChar(93);
  } else {
    this.tokenChar(46);
    this.print(node.property, node);
  }
}
function MetaProperty(node) {
  this.print(node.meta, node);
  this.tokenChar(46);
  this.print(node.property, node);
}
function PrivateName(node) {
  this.tokenChar(35);
  this.print(node.id, node);
}
function V8IntrinsicIdentifier(node) {
  this.tokenChar(37);
  this.word(node.name);
}
function ModuleExpression(node) {
  this.word("module", true);
  this.space();
  this.tokenChar(123);
  this.indent();
  const {
    body
  } = node;
  if (body.body.length || body.directives.length) {
    this.newline();
  }
  this.print(body, node);
  this.dedent();
  this.rightBrace(node);
}



},{"../node/index.js":15,"@babel/types":69}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AnyTypeAnnotation = AnyTypeAnnotation;
exports.ArrayTypeAnnotation = ArrayTypeAnnotation;
exports.BooleanLiteralTypeAnnotation = BooleanLiteralTypeAnnotation;
exports.BooleanTypeAnnotation = BooleanTypeAnnotation;
exports.DeclareClass = DeclareClass;
exports.DeclareExportAllDeclaration = DeclareExportAllDeclaration;
exports.DeclareExportDeclaration = DeclareExportDeclaration;
exports.DeclareFunction = DeclareFunction;
exports.DeclareInterface = DeclareInterface;
exports.DeclareModule = DeclareModule;
exports.DeclareModuleExports = DeclareModuleExports;
exports.DeclareOpaqueType = DeclareOpaqueType;
exports.DeclareTypeAlias = DeclareTypeAlias;
exports.DeclareVariable = DeclareVariable;
exports.DeclaredPredicate = DeclaredPredicate;
exports.EmptyTypeAnnotation = EmptyTypeAnnotation;
exports.EnumBooleanBody = EnumBooleanBody;
exports.EnumBooleanMember = EnumBooleanMember;
exports.EnumDeclaration = EnumDeclaration;
exports.EnumDefaultedMember = EnumDefaultedMember;
exports.EnumNumberBody = EnumNumberBody;
exports.EnumNumberMember = EnumNumberMember;
exports.EnumStringBody = EnumStringBody;
exports.EnumStringMember = EnumStringMember;
exports.EnumSymbolBody = EnumSymbolBody;
exports.ExistsTypeAnnotation = ExistsTypeAnnotation;
exports.FunctionTypeAnnotation = FunctionTypeAnnotation;
exports.FunctionTypeParam = FunctionTypeParam;
exports.IndexedAccessType = IndexedAccessType;
exports.InferredPredicate = InferredPredicate;
exports.InterfaceDeclaration = InterfaceDeclaration;
exports.GenericTypeAnnotation = exports.ClassImplements = exports.InterfaceExtends = InterfaceExtends;
exports.InterfaceTypeAnnotation = InterfaceTypeAnnotation;
exports.IntersectionTypeAnnotation = IntersectionTypeAnnotation;
exports.MixedTypeAnnotation = MixedTypeAnnotation;
exports.NullLiteralTypeAnnotation = NullLiteralTypeAnnotation;
exports.NullableTypeAnnotation = NullableTypeAnnotation;
Object.defineProperty(exports, "NumberLiteralTypeAnnotation", {
  enumerable: true,
  get: function () {
    return _types2.NumericLiteral;
  }
});
exports.NumberTypeAnnotation = NumberTypeAnnotation;
exports.ObjectTypeAnnotation = ObjectTypeAnnotation;
exports.ObjectTypeCallProperty = ObjectTypeCallProperty;
exports.ObjectTypeIndexer = ObjectTypeIndexer;
exports.ObjectTypeInternalSlot = ObjectTypeInternalSlot;
exports.ObjectTypeProperty = ObjectTypeProperty;
exports.ObjectTypeSpreadProperty = ObjectTypeSpreadProperty;
exports.OpaqueType = OpaqueType;
exports.OptionalIndexedAccessType = OptionalIndexedAccessType;
exports.QualifiedTypeIdentifier = QualifiedTypeIdentifier;
Object.defineProperty(exports, "StringLiteralTypeAnnotation", {
  enumerable: true,
  get: function () {
    return _types2.StringLiteral;
  }
});
exports.StringTypeAnnotation = StringTypeAnnotation;
exports.SymbolTypeAnnotation = SymbolTypeAnnotation;
exports.ThisTypeAnnotation = ThisTypeAnnotation;
exports.TupleTypeAnnotation = TupleTypeAnnotation;
exports.TypeAlias = TypeAlias;
exports.TypeAnnotation = TypeAnnotation;
exports.TypeCastExpression = TypeCastExpression;
exports.TypeParameter = TypeParameter;
exports.TypeParameterDeclaration = exports.TypeParameterInstantiation = TypeParameterInstantiation;
exports.TypeofTypeAnnotation = TypeofTypeAnnotation;
exports.UnionTypeAnnotation = UnionTypeAnnotation;
exports.Variance = Variance;
exports.VoidTypeAnnotation = VoidTypeAnnotation;
exports._interfaceish = _interfaceish;
exports._variance = _variance;
var _t = require("@babel/types");
var _modules = require("./modules.js");
var _types2 = require("./types.js");
const {
  isDeclareExportDeclaration,
  isStatement
} = _t;
function AnyTypeAnnotation() {
  this.word("any");
}
function ArrayTypeAnnotation(node) {
  this.print(node.elementType, node, true);
  this.tokenChar(91);
  this.tokenChar(93);
}
function BooleanTypeAnnotation() {
  this.word("boolean");
}
function BooleanLiteralTypeAnnotation(node) {
  this.word(node.value ? "true" : "false");
}
function NullLiteralTypeAnnotation() {
  this.word("null");
}
function DeclareClass(node, parent) {
  if (!isDeclareExportDeclaration(parent)) {
    this.word("declare");
    this.space();
  }
  this.word("class");
  this.space();
  this._interfaceish(node);
}
function DeclareFunction(node, parent) {
  if (!isDeclareExportDeclaration(parent)) {
    this.word("declare");
    this.space();
  }
  this.word("function");
  this.space();
  this.print(node.id, node);
  this.print(node.id.typeAnnotation.typeAnnotation, node);
  if (node.predicate) {
    this.space();
    this.print(node.predicate, node);
  }
  this.semicolon();
}
function InferredPredicate() {
  this.tokenChar(37);
  this.word("checks");
}
function DeclaredPredicate(node) {
  this.tokenChar(37);
  this.word("checks");
  this.tokenChar(40);
  this.print(node.value, node);
  this.tokenChar(41);
}
function DeclareInterface(node) {
  this.word("declare");
  this.space();
  this.InterfaceDeclaration(node);
}
function DeclareModule(node) {
  this.word("declare");
  this.space();
  this.word("module");
  this.space();
  this.print(node.id, node);
  this.space();
  this.print(node.body, node);
}
function DeclareModuleExports(node) {
  this.word("declare");
  this.space();
  this.word("module");
  this.tokenChar(46);
  this.word("exports");
  this.print(node.typeAnnotation, node);
}
function DeclareTypeAlias(node) {
  this.word("declare");
  this.space();
  this.TypeAlias(node);
}
function DeclareOpaqueType(node, parent) {
  if (!isDeclareExportDeclaration(parent)) {
    this.word("declare");
    this.space();
  }
  this.OpaqueType(node);
}
function DeclareVariable(node, parent) {
  if (!isDeclareExportDeclaration(parent)) {
    this.word("declare");
    this.space();
  }
  this.word("var");
  this.space();
  this.print(node.id, node);
  this.print(node.id.typeAnnotation, node);
  this.semicolon();
}
function DeclareExportDeclaration(node) {
  this.word("declare");
  this.space();
  this.word("export");
  this.space();
  if (node.default) {
    this.word("default");
    this.space();
  }
  FlowExportDeclaration.call(this, node);
}
function DeclareExportAllDeclaration(node) {
  this.word("declare");
  this.space();
  _modules.ExportAllDeclaration.call(this, node);
}
function EnumDeclaration(node) {
  const {
    id,
    body
  } = node;
  this.word("enum");
  this.space();
  this.print(id, node);
  this.print(body, node);
}
function enumExplicitType(context, name, hasExplicitType) {
  if (hasExplicitType) {
    context.space();
    context.word("of");
    context.space();
    context.word(name);
  }
  context.space();
}
function enumBody(context, node) {
  const {
    members
  } = node;
  context.token("{");
  context.indent();
  context.newline();
  for (const member of members) {
    context.print(member, node);
    context.newline();
  }
  if (node.hasUnknownMembers) {
    context.token("...");
    context.newline();
  }
  context.dedent();
  context.token("}");
}
function EnumBooleanBody(node) {
  const {
    explicitType
  } = node;
  enumExplicitType(this, "boolean", explicitType);
  enumBody(this, node);
}
function EnumNumberBody(node) {
  const {
    explicitType
  } = node;
  enumExplicitType(this, "number", explicitType);
  enumBody(this, node);
}
function EnumStringBody(node) {
  const {
    explicitType
  } = node;
  enumExplicitType(this, "string", explicitType);
  enumBody(this, node);
}
function EnumSymbolBody(node) {
  enumExplicitType(this, "symbol", true);
  enumBody(this, node);
}
function EnumDefaultedMember(node) {
  const {
    id
  } = node;
  this.print(id, node);
  this.tokenChar(44);
}
function enumInitializedMember(context, node) {
  const {
    id,
    init
  } = node;
  context.print(id, node);
  context.space();
  context.token("=");
  context.space();
  context.print(init, node);
  context.token(",");
}
function EnumBooleanMember(node) {
  enumInitializedMember(this, node);
}
function EnumNumberMember(node) {
  enumInitializedMember(this, node);
}
function EnumStringMember(node) {
  enumInitializedMember(this, node);
}
function FlowExportDeclaration(node) {
  if (node.declaration) {
    const declar = node.declaration;
    this.print(declar, node);
    if (!isStatement(declar)) this.semicolon();
  } else {
    this.tokenChar(123);
    if (node.specifiers.length) {
      this.space();
      this.printList(node.specifiers, node);
      this.space();
    }
    this.tokenChar(125);
    if (node.source) {
      this.space();
      this.word("from");
      this.space();
      this.print(node.source, node);
    }
    this.semicolon();
  }
}
function ExistsTypeAnnotation() {
  this.tokenChar(42);
}
function FunctionTypeAnnotation(node, parent) {
  this.print(node.typeParameters, node);
  this.tokenChar(40);
  if (node.this) {
    this.word("this");
    this.tokenChar(58);
    this.space();
    this.print(node.this.typeAnnotation, node);
    if (node.params.length || node.rest) {
      this.tokenChar(44);
      this.space();
    }
  }
  this.printList(node.params, node);
  if (node.rest) {
    if (node.params.length) {
      this.tokenChar(44);
      this.space();
    }
    this.token("...");
    this.print(node.rest, node);
  }
  this.tokenChar(41);
  const type = parent == null ? void 0 : parent.type;
  if (type != null && (type === "ObjectTypeCallProperty" || type === "ObjectTypeInternalSlot" || type === "DeclareFunction" || type === "ObjectTypeProperty" && parent.method)) {
    this.tokenChar(58);
  } else {
    this.space();
    this.token("=>");
  }
  this.space();
  this.print(node.returnType, node);
}
function FunctionTypeParam(node) {
  this.print(node.name, node);
  if (node.optional) this.tokenChar(63);
  if (node.name) {
    this.tokenChar(58);
    this.space();
  }
  this.print(node.typeAnnotation, node);
}
function InterfaceExtends(node) {
  this.print(node.id, node);
  this.print(node.typeParameters, node, true);
}
function _interfaceish(node) {
  var _node$extends;
  this.print(node.id, node);
  this.print(node.typeParameters, node);
  if ((_node$extends = node.extends) != null && _node$extends.length) {
    this.space();
    this.word("extends");
    this.space();
    this.printList(node.extends, node);
  }
  if (node.type === "DeclareClass") {
    var _node$mixins, _node$implements;
    if ((_node$mixins = node.mixins) != null && _node$mixins.length) {
      this.space();
      this.word("mixins");
      this.space();
      this.printList(node.mixins, node);
    }
    if ((_node$implements = node.implements) != null && _node$implements.length) {
      this.space();
      this.word("implements");
      this.space();
      this.printList(node.implements, node);
    }
  }
  this.space();
  this.print(node.body, node);
}
function _variance(node) {
  var _node$variance;
  const kind = (_node$variance = node.variance) == null ? void 0 : _node$variance.kind;
  if (kind != null) {
    if (kind === "plus") {
      this.tokenChar(43);
    } else if (kind === "minus") {
      this.tokenChar(45);
    }
  }
}
function InterfaceDeclaration(node) {
  this.word("interface");
  this.space();
  this._interfaceish(node);
}
function andSeparator() {
  this.space();
  this.tokenChar(38);
  this.space();
}
function InterfaceTypeAnnotation(node) {
  var _node$extends2;
  this.word("interface");
  if ((_node$extends2 = node.extends) != null && _node$extends2.length) {
    this.space();
    this.word("extends");
    this.space();
    this.printList(node.extends, node);
  }
  this.space();
  this.print(node.body, node);
}
function IntersectionTypeAnnotation(node) {
  this.printJoin(node.types, node, {
    separator: andSeparator
  });
}
function MixedTypeAnnotation() {
  this.word("mixed");
}
function EmptyTypeAnnotation() {
  this.word("empty");
}
function NullableTypeAnnotation(node) {
  this.tokenChar(63);
  this.print(node.typeAnnotation, node);
}
function NumberTypeAnnotation() {
  this.word("number");
}
function StringTypeAnnotation() {
  this.word("string");
}
function ThisTypeAnnotation() {
  this.word("this");
}
function TupleTypeAnnotation(node) {
  this.tokenChar(91);
  this.printList(node.types, node);
  this.tokenChar(93);
}
function TypeofTypeAnnotation(node) {
  this.word("typeof");
  this.space();
  this.print(node.argument, node);
}
function TypeAlias(node) {
  this.word("type");
  this.space();
  this.print(node.id, node);
  this.print(node.typeParameters, node);
  this.space();
  this.tokenChar(61);
  this.space();
  this.print(node.right, node);
  this.semicolon();
}
function TypeAnnotation(node) {
  this.tokenChar(58);
  this.space();
  if (node.optional) this.tokenChar(63);
  this.print(node.typeAnnotation, node);
}
function TypeParameterInstantiation(node) {
  this.tokenChar(60);
  this.printList(node.params, node, {});
  this.tokenChar(62);
}
function TypeParameter(node) {
  this._variance(node);
  this.word(node.name);
  if (node.bound) {
    this.print(node.bound, node);
  }
  if (node.default) {
    this.space();
    this.tokenChar(61);
    this.space();
    this.print(node.default, node);
  }
}
function OpaqueType(node) {
  this.word("opaque");
  this.space();
  this.word("type");
  this.space();
  this.print(node.id, node);
  this.print(node.typeParameters, node);
  if (node.supertype) {
    this.tokenChar(58);
    this.space();
    this.print(node.supertype, node);
  }
  if (node.impltype) {
    this.space();
    this.tokenChar(61);
    this.space();
    this.print(node.impltype, node);
  }
  this.semicolon();
}
function ObjectTypeAnnotation(node) {
  if (node.exact) {
    this.token("{|");
  } else {
    this.tokenChar(123);
  }
  const props = [...node.properties, ...(node.callProperties || []), ...(node.indexers || []), ...(node.internalSlots || [])];
  if (props.length) {
    this.newline();
    this.space();
    this.printJoin(props, node, {
      addNewlines(leading) {
        if (leading && !props[0]) return 1;
      },
      indent: true,
      statement: true,
      iterator: () => {
        if (props.length !== 1 || node.inexact) {
          this.tokenChar(44);
          this.space();
        }
      }
    });
    this.space();
  }
  if (node.inexact) {
    this.indent();
    this.token("...");
    if (props.length) {
      this.newline();
    }
    this.dedent();
  }
  if (node.exact) {
    this.token("|}");
  } else {
    this.tokenChar(125);
  }
}
function ObjectTypeInternalSlot(node) {
  if (node.static) {
    this.word("static");
    this.space();
  }
  this.tokenChar(91);
  this.tokenChar(91);
  this.print(node.id, node);
  this.tokenChar(93);
  this.tokenChar(93);
  if (node.optional) this.tokenChar(63);
  if (!node.method) {
    this.tokenChar(58);
    this.space();
  }
  this.print(node.value, node);
}
function ObjectTypeCallProperty(node) {
  if (node.static) {
    this.word("static");
    this.space();
  }
  this.print(node.value, node);
}
function ObjectTypeIndexer(node) {
  if (node.static) {
    this.word("static");
    this.space();
  }
  this._variance(node);
  this.tokenChar(91);
  if (node.id) {
    this.print(node.id, node);
    this.tokenChar(58);
    this.space();
  }
  this.print(node.key, node);
  this.tokenChar(93);
  this.tokenChar(58);
  this.space();
  this.print(node.value, node);
}
function ObjectTypeProperty(node) {
  if (node.proto) {
    this.word("proto");
    this.space();
  }
  if (node.static) {
    this.word("static");
    this.space();
  }
  if (node.kind === "get" || node.kind === "set") {
    this.word(node.kind);
    this.space();
  }
  this._variance(node);
  this.print(node.key, node);
  if (node.optional) this.tokenChar(63);
  if (!node.method) {
    this.tokenChar(58);
    this.space();
  }
  this.print(node.value, node);
}
function ObjectTypeSpreadProperty(node) {
  this.token("...");
  this.print(node.argument, node);
}
function QualifiedTypeIdentifier(node) {
  this.print(node.qualification, node);
  this.tokenChar(46);
  this.print(node.id, node);
}
function SymbolTypeAnnotation() {
  this.word("symbol");
}
function orSeparator() {
  this.space();
  this.tokenChar(124);
  this.space();
}
function UnionTypeAnnotation(node) {
  this.printJoin(node.types, node, {
    separator: orSeparator
  });
}
function TypeCastExpression(node) {
  this.tokenChar(40);
  this.print(node.expression, node);
  this.print(node.typeAnnotation, node);
  this.tokenChar(41);
}
function Variance(node) {
  if (node.kind === "plus") {
    this.tokenChar(43);
  } else {
    this.tokenChar(45);
  }
}
function VoidTypeAnnotation() {
  this.word("void");
}
function IndexedAccessType(node) {
  this.print(node.objectType, node, true);
  this.tokenChar(91);
  this.print(node.indexType, node);
  this.tokenChar(93);
}
function OptionalIndexedAccessType(node) {
  this.print(node.objectType, node);
  if (node.optional) {
    this.token("?.");
  }
  this.tokenChar(91);
  this.print(node.indexType, node);
  this.tokenChar(93);
}



},{"./modules.js":9,"./types.js":12,"@babel/types":69}],6:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _templateLiterals = require("./template-literals.js");
Object.keys(_templateLiterals).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _templateLiterals[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _templateLiterals[key];
    }
  });
});
var _expressions = require("./expressions.js");
Object.keys(_expressions).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _expressions[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _expressions[key];
    }
  });
});
var _statements = require("./statements.js");
Object.keys(_statements).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _statements[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _statements[key];
    }
  });
});
var _classes = require("./classes.js");
Object.keys(_classes).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _classes[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _classes[key];
    }
  });
});
var _methods = require("./methods.js");
Object.keys(_methods).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _methods[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _methods[key];
    }
  });
});
var _modules = require("./modules.js");
Object.keys(_modules).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _modules[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _modules[key];
    }
  });
});
var _types = require("./types.js");
Object.keys(_types).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _types[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _types[key];
    }
  });
});
var _flow = require("./flow.js");
Object.keys(_flow).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _flow[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _flow[key];
    }
  });
});
var _base = require("./base.js");
Object.keys(_base).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _base[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _base[key];
    }
  });
});
var _jsx = require("./jsx.js");
Object.keys(_jsx).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _jsx[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _jsx[key];
    }
  });
});
var _typescript = require("./typescript.js");
Object.keys(_typescript).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _typescript[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _typescript[key];
    }
  });
});



},{"./base.js":2,"./classes.js":3,"./expressions.js":4,"./flow.js":5,"./jsx.js":7,"./methods.js":8,"./modules.js":9,"./statements.js":10,"./template-literals.js":11,"./types.js":12,"./typescript.js":13}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.JSXAttribute = JSXAttribute;
exports.JSXClosingElement = JSXClosingElement;
exports.JSXClosingFragment = JSXClosingFragment;
exports.JSXElement = JSXElement;
exports.JSXEmptyExpression = JSXEmptyExpression;
exports.JSXExpressionContainer = JSXExpressionContainer;
exports.JSXFragment = JSXFragment;
exports.JSXIdentifier = JSXIdentifier;
exports.JSXMemberExpression = JSXMemberExpression;
exports.JSXNamespacedName = JSXNamespacedName;
exports.JSXOpeningElement = JSXOpeningElement;
exports.JSXOpeningFragment = JSXOpeningFragment;
exports.JSXSpreadAttribute = JSXSpreadAttribute;
exports.JSXSpreadChild = JSXSpreadChild;
exports.JSXText = JSXText;
function JSXAttribute(node) {
  this.print(node.name, node);
  if (node.value) {
    this.tokenChar(61);
    this.print(node.value, node);
  }
}
function JSXIdentifier(node) {
  this.word(node.name);
}
function JSXNamespacedName(node) {
  this.print(node.namespace, node);
  this.tokenChar(58);
  this.print(node.name, node);
}
function JSXMemberExpression(node) {
  this.print(node.object, node);
  this.tokenChar(46);
  this.print(node.property, node);
}
function JSXSpreadAttribute(node) {
  this.tokenChar(123);
  this.token("...");
  this.print(node.argument, node);
  this.tokenChar(125);
}
function JSXExpressionContainer(node) {
  this.tokenChar(123);
  this.print(node.expression, node);
  this.tokenChar(125);
}
function JSXSpreadChild(node) {
  this.tokenChar(123);
  this.token("...");
  this.print(node.expression, node);
  this.tokenChar(125);
}
function JSXText(node) {
  const raw = this.getPossibleRaw(node);
  if (raw !== undefined) {
    this.token(raw, true);
  } else {
    this.token(node.value, true);
  }
}
function JSXElement(node) {
  const open = node.openingElement;
  this.print(open, node);
  if (open.selfClosing) return;
  this.indent();
  for (const child of node.children) {
    this.print(child, node);
  }
  this.dedent();
  this.print(node.closingElement, node);
}
function spaceSeparator() {
  this.space();
}
function JSXOpeningElement(node) {
  this.tokenChar(60);
  this.print(node.name, node);
  this.print(node.typeParameters, node);
  if (node.attributes.length > 0) {
    this.space();
    this.printJoin(node.attributes, node, {
      separator: spaceSeparator
    });
  }
  if (node.selfClosing) {
    this.space();
    this.token("/>");
  } else {
    this.tokenChar(62);
  }
}
function JSXClosingElement(node) {
  this.token("</");
  this.print(node.name, node);
  this.tokenChar(62);
}
function JSXEmptyExpression() {
  this.printInnerComments();
}
function JSXFragment(node) {
  this.print(node.openingFragment, node);
  this.indent();
  for (const child of node.children) {
    this.print(child, node);
  }
  this.dedent();
  this.print(node.closingFragment, node);
}
function JSXOpeningFragment() {
  this.tokenChar(60);
  this.tokenChar(62);
}
function JSXClosingFragment() {
  this.token("</");
  this.tokenChar(62);
}



},{}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ArrowFunctionExpression = ArrowFunctionExpression;
exports.FunctionDeclaration = exports.FunctionExpression = FunctionExpression;
exports._functionHead = _functionHead;
exports._methodHead = _methodHead;
exports._param = _param;
exports._parameters = _parameters;
exports._params = _params;
exports._predicate = _predicate;
var _t = require("@babel/types");
const {
  isIdentifier
} = _t;
function _params(node, idNode, parentNode) {
  this.print(node.typeParameters, node);
  const nameInfo = _getFuncIdName.call(this, idNode, parentNode);
  if (nameInfo) {
    this.sourceIdentifierName(nameInfo.name, nameInfo.pos);
  }
  this.tokenChar(40);
  this._parameters(node.params, node);
  this.tokenChar(41);
  const noLineTerminator = node.type === "ArrowFunctionExpression";
  this.print(node.returnType, node, noLineTerminator);
  this._noLineTerminator = noLineTerminator;
}
function _parameters(parameters, parent) {
  const paramLength = parameters.length;
  for (let i = 0; i < paramLength; i++) {
    this._param(parameters[i], parent);
    if (i < parameters.length - 1) {
      this.tokenChar(44);
      this.space();
    }
  }
}
function _param(parameter, parent) {
  this.printJoin(parameter.decorators, parameter);
  this.print(parameter, parent);
  if (parameter.optional) {
    this.tokenChar(63);
  }
  this.print(parameter.typeAnnotation, parameter);
}
function _methodHead(node) {
  const kind = node.kind;
  const key = node.key;
  if (kind === "get" || kind === "set") {
    this.word(kind);
    this.space();
  }
  if (node.async) {
    this.word("async", true);
    this.space();
  }
  if (kind === "method" || kind === "init") {
    if (node.generator) {
      this.tokenChar(42);
    }
  }
  if (node.computed) {
    this.tokenChar(91);
    this.print(key, node);
    this.tokenChar(93);
  } else {
    this.print(key, node);
  }
  if (node.optional) {
    this.tokenChar(63);
  }
  this._params(node, node.computed && node.key.type !== "StringLiteral" ? undefined : node.key, undefined);
}
function _predicate(node, noLineTerminatorAfter) {
  if (node.predicate) {
    if (!node.returnType) {
      this.tokenChar(58);
    }
    this.space();
    this.print(node.predicate, node, noLineTerminatorAfter);
  }
}
function _functionHead(node, parent) {
  if (node.async) {
    this.word("async");
    this._endsWithInnerRaw = false;
    this.space();
  }
  this.word("function");
  if (node.generator) {
    this._endsWithInnerRaw = false;
    this.tokenChar(42);
  }
  this.space();
  if (node.id) {
    this.print(node.id, node);
  }
  this._params(node, node.id, parent);
  if (node.type !== "TSDeclareFunction") {
    this._predicate(node);
  }
}
function FunctionExpression(node, parent) {
  this._functionHead(node, parent);
  this.space();
  this.print(node.body, node);
}
function ArrowFunctionExpression(node, parent) {
  if (node.async) {
    this.word("async", true);
    this.space();
  }
  let firstParam;
  if (!this.format.retainLines && node.params.length === 1 && isIdentifier(firstParam = node.params[0]) && !hasTypesOrComments(node, firstParam)) {
    this.print(firstParam, node, true);
  } else {
    this._params(node, undefined, parent);
  }
  this._predicate(node, true);
  this.space();
  this.printInnerComments();
  this.token("=>");
  this.space();
  this.print(node.body, node);
}
function hasTypesOrComments(node, param) {
  var _param$leadingComment, _param$trailingCommen;
  return !!(node.typeParameters || node.returnType || node.predicate || param.typeAnnotation || param.optional || (_param$leadingComment = param.leadingComments) != null && _param$leadingComment.length || (_param$trailingCommen = param.trailingComments) != null && _param$trailingCommen.length);
}
function _getFuncIdName(idNode, parent) {
  let id = idNode;
  if (!id && parent) {
    const parentType = parent.type;
    if (parentType === "VariableDeclarator") {
      id = parent.id;
    } else if (parentType === "AssignmentExpression" || parentType === "AssignmentPattern") {
      id = parent.left;
    } else if (parentType === "ObjectProperty" || parentType === "ClassProperty") {
      if (!parent.computed || parent.key.type === "StringLiteral") {
        id = parent.key;
      }
    } else if (parentType === "ClassPrivateProperty" || parentType === "ClassAccessorProperty") {
      id = parent.key;
    }
  }
  if (!id) return;
  let nameInfo;
  if (id.type === "Identifier") {
    var _id$loc, _id$loc2;
    nameInfo = {
      pos: (_id$loc = id.loc) == null ? void 0 : _id$loc.start,
      name: ((_id$loc2 = id.loc) == null ? void 0 : _id$loc2.identifierName) || id.name
    };
  } else if (id.type === "PrivateName") {
    var _id$loc3;
    nameInfo = {
      pos: (_id$loc3 = id.loc) == null ? void 0 : _id$loc3.start,
      name: "#" + id.id.name
    };
  } else if (id.type === "StringLiteral") {
    var _id$loc4;
    nameInfo = {
      pos: (_id$loc4 = id.loc) == null ? void 0 : _id$loc4.start,
      name: id.value
    };
  }
  return nameInfo;
}



},{"@babel/types":69}],9:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ExportAllDeclaration = ExportAllDeclaration;
exports.ExportDefaultDeclaration = ExportDefaultDeclaration;
exports.ExportDefaultSpecifier = ExportDefaultSpecifier;
exports.ExportNamedDeclaration = ExportNamedDeclaration;
exports.ExportNamespaceSpecifier = ExportNamespaceSpecifier;
exports.ExportSpecifier = ExportSpecifier;
exports.ImportAttribute = ImportAttribute;
exports.ImportDeclaration = ImportDeclaration;
exports.ImportDefaultSpecifier = ImportDefaultSpecifier;
exports.ImportExpression = ImportExpression;
exports.ImportNamespaceSpecifier = ImportNamespaceSpecifier;
exports.ImportSpecifier = ImportSpecifier;
exports._printAttributes = _printAttributes;
var _t = require("@babel/types");
const {
  isClassDeclaration,
  isExportDefaultSpecifier,
  isExportNamespaceSpecifier,
  isImportDefaultSpecifier,
  isImportNamespaceSpecifier,
  isStatement
} = _t;
function ImportSpecifier(node) {
  if (node.importKind === "type" || node.importKind === "typeof") {
    this.word(node.importKind);
    this.space();
  }
  this.print(node.imported, node);
  if (node.local && node.local.name !== node.imported.name) {
    this.space();
    this.word("as");
    this.space();
    this.print(node.local, node);
  }
}
function ImportDefaultSpecifier(node) {
  this.print(node.local, node);
}
function ExportDefaultSpecifier(node) {
  this.print(node.exported, node);
}
function ExportSpecifier(node) {
  if (node.exportKind === "type") {
    this.word("type");
    this.space();
  }
  this.print(node.local, node);
  if (node.exported && node.local.name !== node.exported.name) {
    this.space();
    this.word("as");
    this.space();
    this.print(node.exported, node);
  }
}
function ExportNamespaceSpecifier(node) {
  this.tokenChar(42);
  this.space();
  this.word("as");
  this.space();
  this.print(node.exported, node);
}
let warningShown = false;
function _printAttributes(node) {
  const {
    importAttributesKeyword
  } = this.format;
  const {
    attributes,
    assertions
  } = node;
  if (attributes && !importAttributesKeyword && !warningShown) {
    warningShown = true;
    console.warn(`\
You are using import attributes, without specifying the desired output syntax.
Please specify the "importAttributesKeyword" generator option, whose value can be one of:
 - "with"        : \`import { a } from "b" with { type: "json" };\`
 - "assert"      : \`import { a } from "b" assert { type: "json" };\`
 - "with-legacy" : \`import { a } from "b" with type: "json";\`
`);
  }
  const useAssertKeyword = importAttributesKeyword === "assert" || !importAttributesKeyword && assertions;
  this.word(useAssertKeyword ? "assert" : "with");
  this.space();
  if (!useAssertKeyword && importAttributesKeyword !== "with") {
    this.printList(attributes || assertions, node);
    return;
  }
  this.tokenChar(123);
  this.space();
  this.printList(attributes || assertions, node);
  this.space();
  this.tokenChar(125);
}
function ExportAllDeclaration(node) {
  var _node$attributes, _node$assertions;
  this.word("export");
  this.space();
  if (node.exportKind === "type") {
    this.word("type");
    this.space();
  }
  this.tokenChar(42);
  this.space();
  this.word("from");
  this.space();
  if ((_node$attributes = node.attributes) != null && _node$attributes.length || (_node$assertions = node.assertions) != null && _node$assertions.length) {
    this.print(node.source, node, true);
    this.space();
    this._printAttributes(node);
  } else {
    this.print(node.source, node);
  }
  this.semicolon();
}
function maybePrintDecoratorsBeforeExport(printer, node) {
  if (isClassDeclaration(node.declaration) && printer._shouldPrintDecoratorsBeforeExport(node)) {
    printer.printJoin(node.declaration.decorators, node);
  }
}
function ExportNamedDeclaration(node) {
  maybePrintDecoratorsBeforeExport(this, node);
  this.word("export");
  this.space();
  if (node.declaration) {
    const declar = node.declaration;
    this.print(declar, node);
    if (!isStatement(declar)) this.semicolon();
  } else {
    if (node.exportKind === "type") {
      this.word("type");
      this.space();
    }
    const specifiers = node.specifiers.slice(0);
    let hasSpecial = false;
    for (;;) {
      const first = specifiers[0];
      if (isExportDefaultSpecifier(first) || isExportNamespaceSpecifier(first)) {
        hasSpecial = true;
        this.print(specifiers.shift(), node);
        if (specifiers.length) {
          this.tokenChar(44);
          this.space();
        }
      } else {
        break;
      }
    }
    if (specifiers.length || !specifiers.length && !hasSpecial) {
      this.tokenChar(123);
      if (specifiers.length) {
        this.space();
        this.printList(specifiers, node);
        this.space();
      }
      this.tokenChar(125);
    }
    if (node.source) {
      var _node$attributes2, _node$assertions2;
      this.space();
      this.word("from");
      this.space();
      if ((_node$attributes2 = node.attributes) != null && _node$attributes2.length || (_node$assertions2 = node.assertions) != null && _node$assertions2.length) {
        this.print(node.source, node, true);
        this.space();
        this._printAttributes(node);
      } else {
        this.print(node.source, node);
      }
    }
    this.semicolon();
  }
}
function ExportDefaultDeclaration(node) {
  maybePrintDecoratorsBeforeExport(this, node);
  this.word("export");
  this.noIndentInnerCommentsHere();
  this.space();
  this.word("default");
  this.space();
  const declar = node.declaration;
  this.print(declar, node);
  if (!isStatement(declar)) this.semicolon();
}
function ImportDeclaration(node) {
  var _node$attributes3, _node$assertions3;
  this.word("import");
  this.space();
  const isTypeKind = node.importKind === "type" || node.importKind === "typeof";
  if (isTypeKind) {
    this.noIndentInnerCommentsHere();
    this.word(node.importKind);
    this.space();
  } else if (node.module) {
    this.noIndentInnerCommentsHere();
    this.word("module");
    this.space();
  } else if (node.phase) {
    this.noIndentInnerCommentsHere();
    this.word(node.phase);
    this.space();
  }
  const specifiers = node.specifiers.slice(0);
  const hasSpecifiers = !!specifiers.length;
  while (hasSpecifiers) {
    const first = specifiers[0];
    if (isImportDefaultSpecifier(first) || isImportNamespaceSpecifier(first)) {
      this.print(specifiers.shift(), node);
      if (specifiers.length) {
        this.tokenChar(44);
        this.space();
      }
    } else {
      break;
    }
  }
  if (specifiers.length) {
    this.tokenChar(123);
    this.space();
    this.printList(specifiers, node);
    this.space();
    this.tokenChar(125);
  } else if (isTypeKind && !hasSpecifiers) {
    this.tokenChar(123);
    this.tokenChar(125);
  }
  if (hasSpecifiers || isTypeKind) {
    this.space();
    this.word("from");
    this.space();
  }
  if ((_node$attributes3 = node.attributes) != null && _node$attributes3.length || (_node$assertions3 = node.assertions) != null && _node$assertions3.length) {
    this.print(node.source, node, true);
    this.space();
    this._printAttributes(node);
  } else {
    this.print(node.source, node);
  }
  this.semicolon();
}
function ImportAttribute(node) {
  this.print(node.key);
  this.tokenChar(58);
  this.space();
  this.print(node.value);
}
function ImportNamespaceSpecifier(node) {
  this.tokenChar(42);
  this.space();
  this.word("as");
  this.space();
  this.print(node.local, node);
}
function ImportExpression(node) {
  this.word("import");
  if (node.phase) {
    this.tokenChar(46);
    this.word(node.phase);
  }
  this.tokenChar(40);
  this.print(node.source, node);
  if (node.options != null) {
    this.tokenChar(44);
    this.space();
    this.print(node.options, node);
  }
  this.tokenChar(41);
}



},{"@babel/types":69}],10:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BreakStatement = BreakStatement;
exports.CatchClause = CatchClause;
exports.ContinueStatement = ContinueStatement;
exports.DebuggerStatement = DebuggerStatement;
exports.DoWhileStatement = DoWhileStatement;
exports.ForOfStatement = exports.ForInStatement = void 0;
exports.ForStatement = ForStatement;
exports.IfStatement = IfStatement;
exports.LabeledStatement = LabeledStatement;
exports.ReturnStatement = ReturnStatement;
exports.SwitchCase = SwitchCase;
exports.SwitchStatement = SwitchStatement;
exports.ThrowStatement = ThrowStatement;
exports.TryStatement = TryStatement;
exports.VariableDeclaration = VariableDeclaration;
exports.VariableDeclarator = VariableDeclarator;
exports.WhileStatement = WhileStatement;
exports.WithStatement = WithStatement;
var _t = require("@babel/types");
const {
  isFor,
  isForStatement,
  isIfStatement,
  isStatement
} = _t;
function WithStatement(node) {
  this.word("with");
  this.space();
  this.tokenChar(40);
  this.print(node.object, node);
  this.tokenChar(41);
  this.printBlock(node);
}
function IfStatement(node) {
  this.word("if");
  this.space();
  this.tokenChar(40);
  this.print(node.test, node);
  this.tokenChar(41);
  this.space();
  const needsBlock = node.alternate && isIfStatement(getLastStatement(node.consequent));
  if (needsBlock) {
    this.tokenChar(123);
    this.newline();
    this.indent();
  }
  this.printAndIndentOnComments(node.consequent, node);
  if (needsBlock) {
    this.dedent();
    this.newline();
    this.tokenChar(125);
  }
  if (node.alternate) {
    if (this.endsWith(125)) this.space();
    this.word("else");
    this.space();
    this.printAndIndentOnComments(node.alternate, node);
  }
}
function getLastStatement(statement) {
  const {
    body
  } = statement;
  if (isStatement(body) === false) {
    return statement;
  }
  return getLastStatement(body);
}
function ForStatement(node) {
  this.word("for");
  this.space();
  this.tokenChar(40);
  this.inForStatementInitCounter++;
  this.print(node.init, node);
  this.inForStatementInitCounter--;
  this.tokenChar(59);
  if (node.test) {
    this.space();
    this.print(node.test, node);
  }
  this.tokenChar(59);
  if (node.update) {
    this.space();
    this.print(node.update, node);
  }
  this.tokenChar(41);
  this.printBlock(node);
}
function WhileStatement(node) {
  this.word("while");
  this.space();
  this.tokenChar(40);
  this.print(node.test, node);
  this.tokenChar(41);
  this.printBlock(node);
}
function ForXStatement(node) {
  this.word("for");
  this.space();
  const isForOf = node.type === "ForOfStatement";
  if (isForOf && node.await) {
    this.word("await");
    this.space();
  }
  this.noIndentInnerCommentsHere();
  this.tokenChar(40);
  this.print(node.left, node);
  this.space();
  this.word(isForOf ? "of" : "in");
  this.space();
  this.print(node.right, node);
  this.tokenChar(41);
  this.printBlock(node);
}
const ForInStatement = exports.ForInStatement = ForXStatement;
const ForOfStatement = exports.ForOfStatement = ForXStatement;
function DoWhileStatement(node) {
  this.word("do");
  this.space();
  this.print(node.body, node);
  this.space();
  this.word("while");
  this.space();
  this.tokenChar(40);
  this.print(node.test, node);
  this.tokenChar(41);
  this.semicolon();
}
function printStatementAfterKeyword(printer, node, parent, isLabel) {
  if (node) {
    printer.space();
    printer.printTerminatorless(node, parent, isLabel);
  }
  printer.semicolon();
}
function BreakStatement(node) {
  this.word("break");
  printStatementAfterKeyword(this, node.label, node, true);
}
function ContinueStatement(node) {
  this.word("continue");
  printStatementAfterKeyword(this, node.label, node, true);
}
function ReturnStatement(node) {
  this.word("return");
  printStatementAfterKeyword(this, node.argument, node, false);
}
function ThrowStatement(node) {
  this.word("throw");
  printStatementAfterKeyword(this, node.argument, node, false);
}
function LabeledStatement(node) {
  this.print(node.label, node);
  this.tokenChar(58);
  this.space();
  this.print(node.body, node);
}
function TryStatement(node) {
  this.word("try");
  this.space();
  this.print(node.block, node);
  this.space();
  if (node.handlers) {
    this.print(node.handlers[0], node);
  } else {
    this.print(node.handler, node);
  }
  if (node.finalizer) {
    this.space();
    this.word("finally");
    this.space();
    this.print(node.finalizer, node);
  }
}
function CatchClause(node) {
  this.word("catch");
  this.space();
  if (node.param) {
    this.tokenChar(40);
    this.print(node.param, node);
    this.print(node.param.typeAnnotation, node);
    this.tokenChar(41);
    this.space();
  }
  this.print(node.body, node);
}
function SwitchStatement(node) {
  this.word("switch");
  this.space();
  this.tokenChar(40);
  this.print(node.discriminant, node);
  this.tokenChar(41);
  this.space();
  this.tokenChar(123);
  this.printSequence(node.cases, node, {
    indent: true,
    addNewlines(leading, cas) {
      if (!leading && node.cases[node.cases.length - 1] === cas) return -1;
    }
  });
  this.rightBrace(node);
}
function SwitchCase(node) {
  if (node.test) {
    this.word("case");
    this.space();
    this.print(node.test, node);
    this.tokenChar(58);
  } else {
    this.word("default");
    this.tokenChar(58);
  }
  if (node.consequent.length) {
    this.newline();
    this.printSequence(node.consequent, node, {
      indent: true
    });
  }
}
function DebuggerStatement() {
  this.word("debugger");
  this.semicolon();
}
function VariableDeclaration(node, parent) {
  if (node.declare) {
    this.word("declare");
    this.space();
  }
  const {
    kind
  } = node;
  this.word(kind, kind === "using" || kind === "await using");
  this.space();
  let hasInits = false;
  if (!isFor(parent)) {
    for (const declar of node.declarations) {
      if (declar.init) {
        hasInits = true;
      }
    }
  }
  this.printList(node.declarations, node, {
    separator: hasInits ? function () {
      this.tokenChar(44);
      this.newline();
    } : undefined,
    indent: node.declarations.length > 1 ? true : false
  });
  if (isFor(parent)) {
    if (isForStatement(parent)) {
      if (parent.init === node) return;
    } else {
      if (parent.left === node) return;
    }
  }
  this.semicolon();
}
function VariableDeclarator(node) {
  this.print(node.id, node);
  if (node.definite) this.tokenChar(33);
  this.print(node.id.typeAnnotation, node);
  if (node.init) {
    this.space();
    this.tokenChar(61);
    this.space();
    this.print(node.init, node);
  }
}



},{"@babel/types":69}],11:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TaggedTemplateExpression = TaggedTemplateExpression;
exports.TemplateElement = TemplateElement;
exports.TemplateLiteral = TemplateLiteral;
function TaggedTemplateExpression(node) {
  this.print(node.tag, node);
  this.print(node.typeParameters, node);
  this.print(node.quasi, node);
}
function TemplateElement(node, parent) {
  const isFirst = parent.quasis[0] === node;
  const isLast = parent.quasis[parent.quasis.length - 1] === node;
  const value = (isFirst ? "`" : "}") + node.value.raw + (isLast ? "`" : "${");
  this.token(value, true);
}
function TemplateLiteral(node) {
  const quasis = node.quasis;
  for (let i = 0; i < quasis.length; i++) {
    this.print(quasis[i], node);
    if (i + 1 < quasis.length) {
      this.print(node.expressions[i], node);
    }
  }
}



},{}],12:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ArgumentPlaceholder = ArgumentPlaceholder;
exports.ArrayPattern = exports.ArrayExpression = ArrayExpression;
exports.BigIntLiteral = BigIntLiteral;
exports.BooleanLiteral = BooleanLiteral;
exports.DecimalLiteral = DecimalLiteral;
exports.Identifier = Identifier;
exports.NullLiteral = NullLiteral;
exports.NumericLiteral = NumericLiteral;
exports.ObjectPattern = exports.ObjectExpression = ObjectExpression;
exports.ObjectMethod = ObjectMethod;
exports.ObjectProperty = ObjectProperty;
exports.PipelineBareFunction = PipelineBareFunction;
exports.PipelinePrimaryTopicReference = PipelinePrimaryTopicReference;
exports.PipelineTopicExpression = PipelineTopicExpression;
exports.RecordExpression = RecordExpression;
exports.RegExpLiteral = RegExpLiteral;
exports.SpreadElement = exports.RestElement = RestElement;
exports.StringLiteral = StringLiteral;
exports.TopicReference = TopicReference;
exports.TupleExpression = TupleExpression;
var _t = require("@babel/types");
var _jsesc = require("jsesc");
const {
  isAssignmentPattern,
  isIdentifier
} = _t;
function Identifier(node) {
  var _node$loc;
  this.sourceIdentifierName(((_node$loc = node.loc) == null ? void 0 : _node$loc.identifierName) || node.name);
  this.word(node.name);
}
function ArgumentPlaceholder() {
  this.tokenChar(63);
}
function RestElement(node) {
  this.token("...");
  this.print(node.argument, node);
}
function ObjectExpression(node) {
  const props = node.properties;
  this.tokenChar(123);
  if (props.length) {
    this.space();
    this.printList(props, node, {
      indent: true,
      statement: true
    });
    this.space();
  }
  this.sourceWithOffset("end", node.loc, -1);
  this.tokenChar(125);
}
function ObjectMethod(node) {
  this.printJoin(node.decorators, node);
  this._methodHead(node);
  this.space();
  this.print(node.body, node);
}
function ObjectProperty(node) {
  this.printJoin(node.decorators, node);
  if (node.computed) {
    this.tokenChar(91);
    this.print(node.key, node);
    this.tokenChar(93);
  } else {
    if (isAssignmentPattern(node.value) && isIdentifier(node.key) && node.key.name === node.value.left.name) {
      this.print(node.value, node);
      return;
    }
    this.print(node.key, node);
    if (node.shorthand && isIdentifier(node.key) && isIdentifier(node.value) && node.key.name === node.value.name) {
      return;
    }
  }
  this.tokenChar(58);
  this.space();
  this.print(node.value, node);
}
function ArrayExpression(node) {
  const elems = node.elements;
  const len = elems.length;
  this.tokenChar(91);
  for (let i = 0; i < elems.length; i++) {
    const elem = elems[i];
    if (elem) {
      if (i > 0) this.space();
      this.print(elem, node);
      if (i < len - 1) this.tokenChar(44);
    } else {
      this.tokenChar(44);
    }
  }
  this.tokenChar(93);
}
function RecordExpression(node) {
  const props = node.properties;
  let startToken;
  let endToken;
  if (this.format.recordAndTupleSyntaxType === "bar") {
    startToken = "{|";
    endToken = "|}";
  } else if (this.format.recordAndTupleSyntaxType !== "hash" && this.format.recordAndTupleSyntaxType != null) {
    throw new Error(`The "recordAndTupleSyntaxType" generator option must be "bar" or "hash" (${JSON.stringify(this.format.recordAndTupleSyntaxType)} received).`);
  } else {
    startToken = "#{";
    endToken = "}";
  }
  this.token(startToken);
  if (props.length) {
    this.space();
    this.printList(props, node, {
      indent: true,
      statement: true
    });
    this.space();
  }
  this.token(endToken);
}
function TupleExpression(node) {
  const elems = node.elements;
  const len = elems.length;
  let startToken;
  let endToken;
  if (this.format.recordAndTupleSyntaxType === "bar") {
    startToken = "[|";
    endToken = "|]";
  } else if (this.format.recordAndTupleSyntaxType === "hash") {
    startToken = "#[";
    endToken = "]";
  } else {
    throw new Error(`${this.format.recordAndTupleSyntaxType} is not a valid recordAndTuple syntax type`);
  }
  this.token(startToken);
  for (let i = 0; i < elems.length; i++) {
    const elem = elems[i];
    if (elem) {
      if (i > 0) this.space();
      this.print(elem, node);
      if (i < len - 1) this.tokenChar(44);
    }
  }
  this.token(endToken);
}
function RegExpLiteral(node) {
  this.word(`/${node.pattern}/${node.flags}`);
}
function BooleanLiteral(node) {
  this.word(node.value ? "true" : "false");
}
function NullLiteral() {
  this.word("null");
}
function NumericLiteral(node) {
  const raw = this.getPossibleRaw(node);
  const opts = this.format.jsescOption;
  const value = node.value;
  const str = value + "";
  if (opts.numbers) {
    this.number(_jsesc(value, opts), value);
  } else if (raw == null) {
    this.number(str, value);
  } else if (this.format.minified) {
    this.number(raw.length < str.length ? raw : str, value);
  } else {
    this.number(raw, value);
  }
}
function StringLiteral(node) {
  const raw = this.getPossibleRaw(node);
  if (!this.format.minified && raw !== undefined) {
    this.token(raw);
    return;
  }
  const val = _jsesc(node.value, this.format.jsescOption);
  this.token(val);
}
function BigIntLiteral(node) {
  const raw = this.getPossibleRaw(node);
  if (!this.format.minified && raw !== undefined) {
    this.word(raw);
    return;
  }
  this.word(node.value + "n");
}
function DecimalLiteral(node) {
  const raw = this.getPossibleRaw(node);
  if (!this.format.minified && raw !== undefined) {
    this.word(raw);
    return;
  }
  this.word(node.value + "m");
}
const validTopicTokenSet = new Set(["^^", "@@", "^", "%", "#"]);
function TopicReference() {
  const {
    topicToken
  } = this.format;
  if (validTopicTokenSet.has(topicToken)) {
    this.token(topicToken);
  } else {
    const givenTopicTokenJSON = JSON.stringify(topicToken);
    const validTopics = Array.from(validTopicTokenSet, v => JSON.stringify(v));
    throw new Error(`The "topicToken" generator option must be one of ` + `${validTopics.join(", ")} (${givenTopicTokenJSON} received instead).`);
  }
}
function PipelineTopicExpression(node) {
  this.print(node.expression, node);
}
function PipelineBareFunction(node) {
  this.print(node.callee, node);
}
function PipelinePrimaryTopicReference() {
  this.tokenChar(35);
}



},{"@babel/types":69,"jsesc":115}],13:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TSAnyKeyword = TSAnyKeyword;
exports.TSArrayType = TSArrayType;
exports.TSSatisfiesExpression = exports.TSAsExpression = TSTypeExpression;
exports.TSBigIntKeyword = TSBigIntKeyword;
exports.TSBooleanKeyword = TSBooleanKeyword;
exports.TSCallSignatureDeclaration = TSCallSignatureDeclaration;
exports.TSConditionalType = TSConditionalType;
exports.TSConstructSignatureDeclaration = TSConstructSignatureDeclaration;
exports.TSConstructorType = TSConstructorType;
exports.TSDeclareFunction = TSDeclareFunction;
exports.TSDeclareMethod = TSDeclareMethod;
exports.TSEnumDeclaration = TSEnumDeclaration;
exports.TSEnumMember = TSEnumMember;
exports.TSExportAssignment = TSExportAssignment;
exports.TSExpressionWithTypeArguments = TSExpressionWithTypeArguments;
exports.TSExternalModuleReference = TSExternalModuleReference;
exports.TSFunctionType = TSFunctionType;
exports.TSImportEqualsDeclaration = TSImportEqualsDeclaration;
exports.TSImportType = TSImportType;
exports.TSIndexSignature = TSIndexSignature;
exports.TSIndexedAccessType = TSIndexedAccessType;
exports.TSInferType = TSInferType;
exports.TSInstantiationExpression = TSInstantiationExpression;
exports.TSInterfaceBody = TSInterfaceBody;
exports.TSInterfaceDeclaration = TSInterfaceDeclaration;
exports.TSIntersectionType = TSIntersectionType;
exports.TSIntrinsicKeyword = TSIntrinsicKeyword;
exports.TSLiteralType = TSLiteralType;
exports.TSMappedType = TSMappedType;
exports.TSMethodSignature = TSMethodSignature;
exports.TSModuleBlock = TSModuleBlock;
exports.TSModuleDeclaration = TSModuleDeclaration;
exports.TSNamedTupleMember = TSNamedTupleMember;
exports.TSNamespaceExportDeclaration = TSNamespaceExportDeclaration;
exports.TSNeverKeyword = TSNeverKeyword;
exports.TSNonNullExpression = TSNonNullExpression;
exports.TSNullKeyword = TSNullKeyword;
exports.TSNumberKeyword = TSNumberKeyword;
exports.TSObjectKeyword = TSObjectKeyword;
exports.TSOptionalType = TSOptionalType;
exports.TSParameterProperty = TSParameterProperty;
exports.TSParenthesizedType = TSParenthesizedType;
exports.TSPropertySignature = TSPropertySignature;
exports.TSQualifiedName = TSQualifiedName;
exports.TSRestType = TSRestType;
exports.TSStringKeyword = TSStringKeyword;
exports.TSSymbolKeyword = TSSymbolKeyword;
exports.TSThisType = TSThisType;
exports.TSTupleType = TSTupleType;
exports.TSTypeAliasDeclaration = TSTypeAliasDeclaration;
exports.TSTypeAnnotation = TSTypeAnnotation;
exports.TSTypeAssertion = TSTypeAssertion;
exports.TSTypeLiteral = TSTypeLiteral;
exports.TSTypeOperator = TSTypeOperator;
exports.TSTypeParameter = TSTypeParameter;
exports.TSTypeParameterDeclaration = exports.TSTypeParameterInstantiation = TSTypeParameterInstantiation;
exports.TSTypePredicate = TSTypePredicate;
exports.TSTypeQuery = TSTypeQuery;
exports.TSTypeReference = TSTypeReference;
exports.TSUndefinedKeyword = TSUndefinedKeyword;
exports.TSUnionType = TSUnionType;
exports.TSUnknownKeyword = TSUnknownKeyword;
exports.TSVoidKeyword = TSVoidKeyword;
exports.tsPrintClassMemberModifiers = tsPrintClassMemberModifiers;
exports.tsPrintFunctionOrConstructorType = tsPrintFunctionOrConstructorType;
exports.tsPrintPropertyOrMethodName = tsPrintPropertyOrMethodName;
exports.tsPrintSignatureDeclarationBase = tsPrintSignatureDeclarationBase;
exports.tsPrintTypeLiteralOrInterfaceBody = tsPrintTypeLiteralOrInterfaceBody;
function TSTypeAnnotation(node) {
  this.tokenChar(58);
  this.space();
  if (node.optional) this.tokenChar(63);
  this.print(node.typeAnnotation, node);
}
function TSTypeParameterInstantiation(node, parent) {
  this.tokenChar(60);
  this.printList(node.params, node, {});
  if (parent.type === "ArrowFunctionExpression" && node.params.length === 1) {
    this.tokenChar(44);
  }
  this.tokenChar(62);
}
function TSTypeParameter(node) {
  if (node.in) {
    this.word("in");
    this.space();
  }
  if (node.out) {
    this.word("out");
    this.space();
  }
  this.word(node.name);
  if (node.constraint) {
    this.space();
    this.word("extends");
    this.space();
    this.print(node.constraint, node);
  }
  if (node.default) {
    this.space();
    this.tokenChar(61);
    this.space();
    this.print(node.default, node);
  }
}
function TSParameterProperty(node) {
  if (node.accessibility) {
    this.word(node.accessibility);
    this.space();
  }
  if (node.readonly) {
    this.word("readonly");
    this.space();
  }
  this._param(node.parameter);
}
function TSDeclareFunction(node, parent) {
  if (node.declare) {
    this.word("declare");
    this.space();
  }
  this._functionHead(node, parent);
  this.tokenChar(59);
}
function TSDeclareMethod(node) {
  this._classMethodHead(node);
  this.tokenChar(59);
}
function TSQualifiedName(node) {
  this.print(node.left, node);
  this.tokenChar(46);
  this.print(node.right, node);
}
function TSCallSignatureDeclaration(node) {
  this.tsPrintSignatureDeclarationBase(node);
  this.tokenChar(59);
}
function TSConstructSignatureDeclaration(node) {
  this.word("new");
  this.space();
  this.tsPrintSignatureDeclarationBase(node);
  this.tokenChar(59);
}
function TSPropertySignature(node) {
  const {
    readonly,
    initializer
  } = node;
  if (readonly) {
    this.word("readonly");
    this.space();
  }
  this.tsPrintPropertyOrMethodName(node);
  this.print(node.typeAnnotation, node);
  if (initializer) {
    this.space();
    this.tokenChar(61);
    this.space();
    this.print(initializer, node);
  }
  this.tokenChar(59);
}
function tsPrintPropertyOrMethodName(node) {
  if (node.computed) {
    this.tokenChar(91);
  }
  this.print(node.key, node);
  if (node.computed) {
    this.tokenChar(93);
  }
  if (node.optional) {
    this.tokenChar(63);
  }
}
function TSMethodSignature(node) {
  const {
    kind
  } = node;
  if (kind === "set" || kind === "get") {
    this.word(kind);
    this.space();
  }
  this.tsPrintPropertyOrMethodName(node);
  this.tsPrintSignatureDeclarationBase(node);
  this.tokenChar(59);
}
function TSIndexSignature(node) {
  const {
    readonly,
    static: isStatic
  } = node;
  if (isStatic) {
    this.word("static");
    this.space();
  }
  if (readonly) {
    this.word("readonly");
    this.space();
  }
  this.tokenChar(91);
  this._parameters(node.parameters, node);
  this.tokenChar(93);
  this.print(node.typeAnnotation, node);
  this.tokenChar(59);
}
function TSAnyKeyword() {
  this.word("any");
}
function TSBigIntKeyword() {
  this.word("bigint");
}
function TSUnknownKeyword() {
  this.word("unknown");
}
function TSNumberKeyword() {
  this.word("number");
}
function TSObjectKeyword() {
  this.word("object");
}
function TSBooleanKeyword() {
  this.word("boolean");
}
function TSStringKeyword() {
  this.word("string");
}
function TSSymbolKeyword() {
  this.word("symbol");
}
function TSVoidKeyword() {
  this.word("void");
}
function TSUndefinedKeyword() {
  this.word("undefined");
}
function TSNullKeyword() {
  this.word("null");
}
function TSNeverKeyword() {
  this.word("never");
}
function TSIntrinsicKeyword() {
  this.word("intrinsic");
}
function TSThisType() {
  this.word("this");
}
function TSFunctionType(node) {
  this.tsPrintFunctionOrConstructorType(node);
}
function TSConstructorType(node) {
  if (node.abstract) {
    this.word("abstract");
    this.space();
  }
  this.word("new");
  this.space();
  this.tsPrintFunctionOrConstructorType(node);
}
function tsPrintFunctionOrConstructorType(node) {
  const {
    typeParameters
  } = node;
  const parameters = node.parameters;
  this.print(typeParameters, node);
  this.tokenChar(40);
  this._parameters(parameters, node);
  this.tokenChar(41);
  this.space();
  this.token("=>");
  this.space();
  const returnType = node.typeAnnotation;
  this.print(returnType.typeAnnotation, node);
}
function TSTypeReference(node) {
  this.print(node.typeName, node, true);
  this.print(node.typeParameters, node, true);
}
function TSTypePredicate(node) {
  if (node.asserts) {
    this.word("asserts");
    this.space();
  }
  this.print(node.parameterName);
  if (node.typeAnnotation) {
    this.space();
    this.word("is");
    this.space();
    this.print(node.typeAnnotation.typeAnnotation);
  }
}
function TSTypeQuery(node) {
  this.word("typeof");
  this.space();
  this.print(node.exprName);
  if (node.typeParameters) {
    this.print(node.typeParameters, node);
  }
}
function TSTypeLiteral(node) {
  this.tsPrintTypeLiteralOrInterfaceBody(node.members, node);
}
function tsPrintTypeLiteralOrInterfaceBody(members, node) {
  tsPrintBraced(this, members, node);
}
function tsPrintBraced(printer, members, node) {
  printer.token("{");
  if (members.length) {
    printer.indent();
    printer.newline();
    for (const member of members) {
      printer.print(member, node);
      printer.newline();
    }
    printer.dedent();
  }
  printer.rightBrace(node);
}
function TSArrayType(node) {
  this.print(node.elementType, node, true);
  this.token("[]");
}
function TSTupleType(node) {
  this.tokenChar(91);
  this.printList(node.elementTypes, node);
  this.tokenChar(93);
}
function TSOptionalType(node) {
  this.print(node.typeAnnotation, node);
  this.tokenChar(63);
}
function TSRestType(node) {
  this.token("...");
  this.print(node.typeAnnotation, node);
}
function TSNamedTupleMember(node) {
  this.print(node.label, node);
  if (node.optional) this.tokenChar(63);
  this.tokenChar(58);
  this.space();
  this.print(node.elementType, node);
}
function TSUnionType(node) {
  tsPrintUnionOrIntersectionType(this, node, "|");
}
function TSIntersectionType(node) {
  tsPrintUnionOrIntersectionType(this, node, "&");
}
function tsPrintUnionOrIntersectionType(printer, node, sep) {
  printer.printJoin(node.types, node, {
    separator() {
      this.space();
      this.token(sep);
      this.space();
    }
  });
}
function TSConditionalType(node) {
  this.print(node.checkType);
  this.space();
  this.word("extends");
  this.space();
  this.print(node.extendsType);
  this.space();
  this.tokenChar(63);
  this.space();
  this.print(node.trueType);
  this.space();
  this.tokenChar(58);
  this.space();
  this.print(node.falseType);
}
function TSInferType(node) {
  this.token("infer");
  this.space();
  this.print(node.typeParameter);
}
function TSParenthesizedType(node) {
  this.tokenChar(40);
  this.print(node.typeAnnotation, node);
  this.tokenChar(41);
}
function TSTypeOperator(node) {
  this.word(node.operator);
  this.space();
  this.print(node.typeAnnotation, node);
}
function TSIndexedAccessType(node) {
  this.print(node.objectType, node, true);
  this.tokenChar(91);
  this.print(node.indexType, node);
  this.tokenChar(93);
}
function TSMappedType(node) {
  const {
    nameType,
    optional,
    readonly,
    typeParameter
  } = node;
  this.tokenChar(123);
  this.space();
  if (readonly) {
    tokenIfPlusMinus(this, readonly);
    this.word("readonly");
    this.space();
  }
  this.tokenChar(91);
  this.word(typeParameter.name);
  this.space();
  this.word("in");
  this.space();
  this.print(typeParameter.constraint, typeParameter);
  if (nameType) {
    this.space();
    this.word("as");
    this.space();
    this.print(nameType, node);
  }
  this.tokenChar(93);
  if (optional) {
    tokenIfPlusMinus(this, optional);
    this.tokenChar(63);
  }
  this.tokenChar(58);
  this.space();
  this.print(node.typeAnnotation, node);
  this.space();
  this.tokenChar(125);
}
function tokenIfPlusMinus(self, tok) {
  if (tok !== true) {
    self.token(tok);
  }
}
function TSLiteralType(node) {
  this.print(node.literal, node);
}
function TSExpressionWithTypeArguments(node) {
  this.print(node.expression, node);
  this.print(node.typeParameters, node);
}
function TSInterfaceDeclaration(node) {
  const {
    declare,
    id,
    typeParameters,
    extends: extendz,
    body
  } = node;
  if (declare) {
    this.word("declare");
    this.space();
  }
  this.word("interface");
  this.space();
  this.print(id, node);
  this.print(typeParameters, node);
  if (extendz != null && extendz.length) {
    this.space();
    this.word("extends");
    this.space();
    this.printList(extendz, node);
  }
  this.space();
  this.print(body, node);
}
function TSInterfaceBody(node) {
  this.tsPrintTypeLiteralOrInterfaceBody(node.body, node);
}
function TSTypeAliasDeclaration(node) {
  const {
    declare,
    id,
    typeParameters,
    typeAnnotation
  } = node;
  if (declare) {
    this.word("declare");
    this.space();
  }
  this.word("type");
  this.space();
  this.print(id, node);
  this.print(typeParameters, node);
  this.space();
  this.tokenChar(61);
  this.space();
  this.print(typeAnnotation, node);
  this.tokenChar(59);
}
function TSTypeExpression(node) {
  var _expression$trailingC;
  const {
    type,
    expression,
    typeAnnotation
  } = node;
  const forceParens = !!((_expression$trailingC = expression.trailingComments) != null && _expression$trailingC.length);
  this.print(expression, node, true, undefined, forceParens);
  this.space();
  this.word(type === "TSAsExpression" ? "as" : "satisfies");
  this.space();
  this.print(typeAnnotation, node);
}
function TSTypeAssertion(node) {
  const {
    typeAnnotation,
    expression
  } = node;
  this.tokenChar(60);
  this.print(typeAnnotation, node);
  this.tokenChar(62);
  this.space();
  this.print(expression, node);
}
function TSInstantiationExpression(node) {
  this.print(node.expression, node);
  this.print(node.typeParameters, node);
}
function TSEnumDeclaration(node) {
  const {
    declare,
    const: isConst,
    id,
    members
  } = node;
  if (declare) {
    this.word("declare");
    this.space();
  }
  if (isConst) {
    this.word("const");
    this.space();
  }
  this.word("enum");
  this.space();
  this.print(id, node);
  this.space();
  tsPrintBraced(this, members, node);
}
function TSEnumMember(node) {
  const {
    id,
    initializer
  } = node;
  this.print(id, node);
  if (initializer) {
    this.space();
    this.tokenChar(61);
    this.space();
    this.print(initializer, node);
  }
  this.tokenChar(44);
}
function TSModuleDeclaration(node) {
  const {
    declare,
    id
  } = node;
  if (declare) {
    this.word("declare");
    this.space();
  }
  if (!node.global) {
    this.word(id.type === "Identifier" ? "namespace" : "module");
    this.space();
  }
  this.print(id, node);
  if (!node.body) {
    this.tokenChar(59);
    return;
  }
  let body = node.body;
  while (body.type === "TSModuleDeclaration") {
    this.tokenChar(46);
    this.print(body.id, body);
    body = body.body;
  }
  this.space();
  this.print(body, node);
}
function TSModuleBlock(node) {
  tsPrintBraced(this, node.body, node);
}
function TSImportType(node) {
  const {
    argument,
    qualifier,
    typeParameters
  } = node;
  this.word("import");
  this.tokenChar(40);
  this.print(argument, node);
  this.tokenChar(41);
  if (qualifier) {
    this.tokenChar(46);
    this.print(qualifier, node);
  }
  if (typeParameters) {
    this.print(typeParameters, node);
  }
}
function TSImportEqualsDeclaration(node) {
  const {
    isExport,
    id,
    moduleReference
  } = node;
  if (isExport) {
    this.word("export");
    this.space();
  }
  this.word("import");
  this.space();
  this.print(id, node);
  this.space();
  this.tokenChar(61);
  this.space();
  this.print(moduleReference, node);
  this.tokenChar(59);
}
function TSExternalModuleReference(node) {
  this.token("require(");
  this.print(node.expression, node);
  this.tokenChar(41);
}
function TSNonNullExpression(node) {
  this.print(node.expression, node);
  this.tokenChar(33);
}
function TSExportAssignment(node) {
  this.word("export");
  this.space();
  this.tokenChar(61);
  this.space();
  this.print(node.expression, node);
  this.tokenChar(59);
}
function TSNamespaceExportDeclaration(node) {
  this.word("export");
  this.space();
  this.word("as");
  this.space();
  this.word("namespace");
  this.space();
  this.print(node.id, node);
}
function tsPrintSignatureDeclarationBase(node) {
  const {
    typeParameters
  } = node;
  const parameters = node.parameters;
  this.print(typeParameters, node);
  this.tokenChar(40);
  this._parameters(parameters, node);
  this.tokenChar(41);
  const returnType = node.typeAnnotation;
  this.print(returnType, node);
}
function tsPrintClassMemberModifiers(node) {
  const isField = node.type === "ClassAccessorProperty" || node.type === "ClassProperty";
  if (isField && node.declare) {
    this.word("declare");
    this.space();
  }
  if (node.accessibility) {
    this.word(node.accessibility);
    this.space();
  }
  if (node.static) {
    this.word("static");
    this.space();
  }
  if (node.override) {
    this.word("override");
    this.space();
  }
  if (node.abstract) {
    this.word("abstract");
    this.space();
  }
  if (isField && node.readonly) {
    this.word("readonly");
    this.space();
  }
}



},{}],14:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CodeGenerator = void 0;
exports.default = generate;
var _sourceMap = require("./source-map.js");
var _printer = require("./printer.js");
class Generator extends _printer.default {
  constructor(ast, opts = {}, code) {
    const format = normalizeOptions(code, opts);
    const map = opts.sourceMaps ? new _sourceMap.default(opts, code) : null;
    super(format, map);
    this.ast = void 0;
    this.ast = ast;
  }
  generate() {
    return super.generate(this.ast);
  }
}
function normalizeOptions(code, opts) {
  var _opts$recordAndTupleS;
  const format = {
    auxiliaryCommentBefore: opts.auxiliaryCommentBefore,
    auxiliaryCommentAfter: opts.auxiliaryCommentAfter,
    shouldPrintComment: opts.shouldPrintComment,
    retainLines: opts.retainLines,
    retainFunctionParens: opts.retainFunctionParens,
    comments: opts.comments == null || opts.comments,
    compact: opts.compact,
    minified: opts.minified,
    concise: opts.concise,
    indent: {
      adjustMultilineComment: true,
      style: "  "
    },
    jsescOption: Object.assign({
      quotes: "double",
      wrap: true,
      minimal: false
    }, opts.jsescOption),
    recordAndTupleSyntaxType: (_opts$recordAndTupleS = opts.recordAndTupleSyntaxType) != null ? _opts$recordAndTupleS : "hash",
    topicToken: opts.topicToken,
    importAttributesKeyword: opts.importAttributesKeyword
  };
  {
    format.decoratorsBeforeExport = opts.decoratorsBeforeExport;
    format.jsescOption.json = opts.jsonCompatibleStrings;
  }
  if (format.minified) {
    format.compact = true;
    format.shouldPrintComment = format.shouldPrintComment || (() => format.comments);
  } else {
    format.shouldPrintComment = format.shouldPrintComment || (value => format.comments || value.includes("@license") || value.includes("@preserve"));
  }
  if (format.compact === "auto") {
    format.compact = typeof code === "string" && code.length > 500000;
    if (format.compact) {
      console.error("[BABEL] Note: The code generator has deoptimised the styling of " + `${opts.filename} as it exceeds the max of ${"500KB"}.`);
    }
  }
  if (format.compact) {
    format.indent.adjustMultilineComment = false;
  }
  const {
    auxiliaryCommentBefore,
    auxiliaryCommentAfter,
    shouldPrintComment
  } = format;
  if (auxiliaryCommentBefore && !shouldPrintComment(auxiliaryCommentBefore)) {
    format.auxiliaryCommentBefore = undefined;
  }
  if (auxiliaryCommentAfter && !shouldPrintComment(auxiliaryCommentAfter)) {
    format.auxiliaryCommentAfter = undefined;
  }
  return format;
}
class CodeGenerator {
  constructor(ast, opts, code) {
    this._generator = void 0;
    this._generator = new Generator(ast, opts, code);
  }
  generate() {
    return this._generator.generate();
  }
}
exports.CodeGenerator = CodeGenerator;
function generate(ast, opts, code) {
  const gen = new Generator(ast, opts, code);
  return gen.generate();
}



},{"./printer.js":18,"./source-map.js":19}],15:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.needsParens = needsParens;
exports.needsWhitespace = needsWhitespace;
exports.needsWhitespaceAfter = needsWhitespaceAfter;
exports.needsWhitespaceBefore = needsWhitespaceBefore;
var whitespace = require("./whitespace.js");
var parens = require("./parentheses.js");
var _t = require("@babel/types");
const {
  FLIPPED_ALIAS_KEYS,
  isCallExpression,
  isExpressionStatement,
  isMemberExpression,
  isNewExpression
} = _t;
function expandAliases(obj) {
  const map = new Map();
  function add(type, func) {
    const fn = map.get(type);
    map.set(type, fn ? function (node, parent, stack) {
      var _fn;
      return (_fn = fn(node, parent, stack)) != null ? _fn : func(node, parent, stack);
    } : func);
  }
  for (const type of Object.keys(obj)) {
    const aliases = FLIPPED_ALIAS_KEYS[type];
    if (aliases) {
      for (const alias of aliases) {
        add(alias, obj[type]);
      }
    } else {
      add(type, obj[type]);
    }
  }
  return map;
}
const expandedParens = expandAliases(parens);
const expandedWhitespaceNodes = expandAliases(whitespace.nodes);
function isOrHasCallExpression(node) {
  if (isCallExpression(node)) {
    return true;
  }
  return isMemberExpression(node) && isOrHasCallExpression(node.object);
}
function needsWhitespace(node, parent, type) {
  var _expandedWhitespaceNo;
  if (!node) return false;
  if (isExpressionStatement(node)) {
    node = node.expression;
  }
  const flag = (_expandedWhitespaceNo = expandedWhitespaceNodes.get(node.type)) == null ? void 0 : _expandedWhitespaceNo(node, parent);
  if (typeof flag === "number") {
    return (flag & type) !== 0;
  }
  return false;
}
function needsWhitespaceBefore(node, parent) {
  return needsWhitespace(node, parent, 1);
}
function needsWhitespaceAfter(node, parent) {
  return needsWhitespace(node, parent, 2);
}
function needsParens(node, parent, printStack) {
  var _expandedParens$get;
  if (!parent) return false;
  if (isNewExpression(parent) && parent.callee === node) {
    if (isOrHasCallExpression(node)) return true;
  }
  return (_expandedParens$get = expandedParens.get(node.type)) == null ? void 0 : _expandedParens$get(node, parent, printStack);
}



},{"./parentheses.js":16,"./whitespace.js":17,"@babel/types":69}],16:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ArrowFunctionExpression = ArrowFunctionExpression;
exports.AssignmentExpression = AssignmentExpression;
exports.Binary = Binary;
exports.BinaryExpression = BinaryExpression;
exports.ClassExpression = ClassExpression;
exports.ConditionalExpression = ConditionalExpression;
exports.DoExpression = DoExpression;
exports.FunctionExpression = FunctionExpression;
exports.FunctionTypeAnnotation = FunctionTypeAnnotation;
exports.Identifier = Identifier;
exports.LogicalExpression = LogicalExpression;
exports.NullableTypeAnnotation = NullableTypeAnnotation;
exports.ObjectExpression = ObjectExpression;
exports.OptionalIndexedAccessType = OptionalIndexedAccessType;
exports.OptionalCallExpression = exports.OptionalMemberExpression = OptionalMemberExpression;
exports.SequenceExpression = SequenceExpression;
exports.TSTypeAssertion = exports.TSSatisfiesExpression = exports.TSAsExpression = TSAsExpression;
exports.TSInferType = TSInferType;
exports.TSInstantiationExpression = TSInstantiationExpression;
exports.TSIntersectionType = exports.TSUnionType = TSUnionType;
exports.UnaryLike = UnaryLike;
exports.IntersectionTypeAnnotation = exports.UnionTypeAnnotation = UnionTypeAnnotation;
exports.UpdateExpression = UpdateExpression;
exports.AwaitExpression = exports.YieldExpression = YieldExpression;
var _t = require("@babel/types");
const {
  isArrayTypeAnnotation,
  isArrowFunctionExpression,
  isBinaryExpression,
  isCallExpression,
  isExportDeclaration,
  isForOfStatement,
  isIndexedAccessType,
  isMemberExpression,
  isObjectPattern,
  isOptionalMemberExpression,
  isYieldExpression
} = _t;
const PRECEDENCE = new Map([["||", 0], ["??", 0], ["|>", 0], ["&&", 1], ["|", 2], ["^", 3], ["&", 4], ["==", 5], ["===", 5], ["!=", 5], ["!==", 5], ["<", 6], [">", 6], ["<=", 6], [">=", 6], ["in", 6], ["instanceof", 6], [">>", 7], ["<<", 7], [">>>", 7], ["+", 8], ["-", 8], ["*", 9], ["/", 9], ["%", 9], ["**", 10]]);
function isTSTypeExpression(nodeType) {
  return nodeType === "TSAsExpression" || nodeType === "TSSatisfiesExpression" || nodeType === "TSTypeAssertion";
}
const isClassExtendsClause = (node, parent) => {
  const parentType = parent.type;
  return (parentType === "ClassDeclaration" || parentType === "ClassExpression") && parent.superClass === node;
};
const hasPostfixPart = (node, parent) => {
  const parentType = parent.type;
  return (parentType === "MemberExpression" || parentType === "OptionalMemberExpression") && parent.object === node || (parentType === "CallExpression" || parentType === "OptionalCallExpression" || parentType === "NewExpression") && parent.callee === node || parentType === "TaggedTemplateExpression" && parent.tag === node || parentType === "TSNonNullExpression";
};
function NullableTypeAnnotation(node, parent) {
  return isArrayTypeAnnotation(parent);
}
function FunctionTypeAnnotation(node, parent, printStack) {
  if (printStack.length < 3) return;
  const parentType = parent.type;
  return parentType === "UnionTypeAnnotation" || parentType === "IntersectionTypeAnnotation" || parentType === "ArrayTypeAnnotation" || parentType === "TypeAnnotation" && isArrowFunctionExpression(printStack[printStack.length - 3]);
}
function UpdateExpression(node, parent) {
  return hasPostfixPart(node, parent) || isClassExtendsClause(node, parent);
}
function ObjectExpression(node, parent, printStack) {
  return isFirstInContext(printStack, 1 | 2);
}
function DoExpression(node, parent, printStack) {
  return !node.async && isFirstInContext(printStack, 1);
}
function Binary(node, parent) {
  const parentType = parent.type;
  if (node.operator === "**" && parentType === "BinaryExpression" && parent.operator === "**") {
    return parent.left === node;
  }
  if (isClassExtendsClause(node, parent)) {
    return true;
  }
  if (hasPostfixPart(node, parent) || parentType === "UnaryExpression" || parentType === "SpreadElement" || parentType === "AwaitExpression") {
    return true;
  }
  if (parentType === "BinaryExpression" || parentType === "LogicalExpression") {
    const parentPos = PRECEDENCE.get(parent.operator);
    const nodePos = PRECEDENCE.get(node.operator);
    if (parentPos === nodePos && parent.right === node && parentType !== "LogicalExpression" || parentPos > nodePos) {
      return true;
    }
  }
  return undefined;
}
function UnionTypeAnnotation(node, parent) {
  const parentType = parent.type;
  return parentType === "ArrayTypeAnnotation" || parentType === "NullableTypeAnnotation" || parentType === "IntersectionTypeAnnotation" || parentType === "UnionTypeAnnotation";
}
function OptionalIndexedAccessType(node, parent) {
  return isIndexedAccessType(parent) && parent.objectType === node;
}
function TSAsExpression() {
  return true;
}
function TSUnionType(node, parent) {
  const parentType = parent.type;
  return parentType === "TSArrayType" || parentType === "TSOptionalType" || parentType === "TSIntersectionType" || parentType === "TSUnionType" || parentType === "TSRestType";
}
function TSInferType(node, parent) {
  const parentType = parent.type;
  return parentType === "TSArrayType" || parentType === "TSOptionalType";
}
function TSInstantiationExpression(node, parent) {
  const parentType = parent.type;
  return (parentType === "CallExpression" || parentType === "OptionalCallExpression" || parentType === "NewExpression" || parentType === "TSInstantiationExpression") && !!parent.typeParameters;
}
function BinaryExpression(node, parent) {
  if (node.operator === "in") {
    const parentType = parent.type;
    return parentType === "VariableDeclarator" || parentType === "ForStatement" || parentType === "ForInStatement" || parentType === "ForOfStatement";
  }
  return false;
}
function SequenceExpression(node, parent) {
  const parentType = parent.type;
  if (parentType === "ForStatement" || parentType === "ThrowStatement" || parentType === "ReturnStatement" || parentType === "IfStatement" && parent.test === node || parentType === "WhileStatement" && parent.test === node || parentType === "ForInStatement" && parent.right === node || parentType === "SwitchStatement" && parent.discriminant === node || parentType === "ExpressionStatement" && parent.expression === node) {
    return false;
  }
  return true;
}
function YieldExpression(node, parent) {
  const parentType = parent.type;
  return parentType === "BinaryExpression" || parentType === "LogicalExpression" || parentType === "UnaryExpression" || parentType === "SpreadElement" || hasPostfixPart(node, parent) || parentType === "AwaitExpression" && isYieldExpression(node) || parentType === "ConditionalExpression" && node === parent.test || isClassExtendsClause(node, parent);
}
function ClassExpression(node, parent, printStack) {
  return isFirstInContext(printStack, 1 | 4);
}
function UnaryLike(node, parent) {
  return hasPostfixPart(node, parent) || isBinaryExpression(parent) && parent.operator === "**" && parent.left === node || isClassExtendsClause(node, parent);
}
function FunctionExpression(node, parent, printStack) {
  return isFirstInContext(printStack, 1 | 4);
}
function ArrowFunctionExpression(node, parent) {
  return isExportDeclaration(parent) || ConditionalExpression(node, parent);
}
function ConditionalExpression(node, parent) {
  const parentType = parent.type;
  if (parentType === "UnaryExpression" || parentType === "SpreadElement" || parentType === "BinaryExpression" || parentType === "LogicalExpression" || parentType === "ConditionalExpression" && parent.test === node || parentType === "AwaitExpression" || isTSTypeExpression(parentType)) {
    return true;
  }
  return UnaryLike(node, parent);
}
function OptionalMemberExpression(node, parent) {
  return isCallExpression(parent) && parent.callee === node || isMemberExpression(parent) && parent.object === node;
}
function AssignmentExpression(node, parent) {
  if (isObjectPattern(node.left)) {
    return true;
  } else {
    return ConditionalExpression(node, parent);
  }
}
function LogicalExpression(node, parent) {
  const parentType = parent.type;
  if (isTSTypeExpression(parentType)) return true;
  if (parentType !== "LogicalExpression") return false;
  switch (node.operator) {
    case "||":
      return parent.operator === "??" || parent.operator === "&&";
    case "&&":
      return parent.operator === "??";
    case "??":
      return parent.operator !== "??";
  }
}
function Identifier(node, parent, printStack) {
  var _node$extra;
  const parentType = parent.type;
  if ((_node$extra = node.extra) != null && _node$extra.parenthesized && parentType === "AssignmentExpression" && parent.left === node) {
    const rightType = parent.right.type;
    if ((rightType === "FunctionExpression" || rightType === "ClassExpression") && parent.right.id == null) {
      return true;
    }
  }
  if (node.name === "let") {
    const isFollowedByBracket = isMemberExpression(parent, {
      object: node,
      computed: true
    }) || isOptionalMemberExpression(parent, {
      object: node,
      computed: true,
      optional: false
    });
    return isFirstInContext(printStack, isFollowedByBracket ? 1 | 8 | 16 | 32 : 32);
  }
  return node.name === "async" && isForOfStatement(parent) && node === parent.left;
}
function isFirstInContext(printStack, checkParam) {
  const expressionStatement = checkParam & 1;
  const arrowBody = checkParam & 2;
  const exportDefault = checkParam & 4;
  const forHead = checkParam & 8;
  const forInHead = checkParam & 16;
  const forOfHead = checkParam & 32;
  let i = printStack.length - 1;
  if (i <= 0) return;
  let node = printStack[i];
  i--;
  let parent = printStack[i];
  while (i >= 0) {
    const parentType = parent.type;
    if (expressionStatement && parentType === "ExpressionStatement" && parent.expression === node || exportDefault && parentType === "ExportDefaultDeclaration" && node === parent.declaration || arrowBody && parentType === "ArrowFunctionExpression" && parent.body === node || forHead && parentType === "ForStatement" && parent.init === node || forInHead && parentType === "ForInStatement" && parent.left === node || forOfHead && parentType === "ForOfStatement" && parent.left === node) {
      return true;
    }
    if (i > 0 && (hasPostfixPart(node, parent) && parentType !== "NewExpression" || parentType === "SequenceExpression" && parent.expressions[0] === node || parentType === "UpdateExpression" && !parent.prefix || parentType === "ConditionalExpression" && parent.test === node || (parentType === "BinaryExpression" || parentType === "LogicalExpression") && parent.left === node || parentType === "AssignmentExpression" && parent.left === node)) {
      node = parent;
      i--;
      parent = printStack[i];
    } else {
      return false;
    }
  }
  return false;
}



},{"@babel/types":69}],17:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.nodes = void 0;
var _t = require("@babel/types");
const {
  FLIPPED_ALIAS_KEYS,
  isArrayExpression,
  isAssignmentExpression,
  isBinary,
  isBlockStatement,
  isCallExpression,
  isFunction,
  isIdentifier,
  isLiteral,
  isMemberExpression,
  isObjectExpression,
  isOptionalCallExpression,
  isOptionalMemberExpression,
  isStringLiteral
} = _t;
function crawlInternal(node, state) {
  if (!node) return state;
  if (isMemberExpression(node) || isOptionalMemberExpression(node)) {
    crawlInternal(node.object, state);
    if (node.computed) crawlInternal(node.property, state);
  } else if (isBinary(node) || isAssignmentExpression(node)) {
    crawlInternal(node.left, state);
    crawlInternal(node.right, state);
  } else if (isCallExpression(node) || isOptionalCallExpression(node)) {
    state.hasCall = true;
    crawlInternal(node.callee, state);
  } else if (isFunction(node)) {
    state.hasFunction = true;
  } else if (isIdentifier(node)) {
    state.hasHelper = state.hasHelper || node.callee && isHelper(node.callee);
  }
  return state;
}
function crawl(node) {
  return crawlInternal(node, {
    hasCall: false,
    hasFunction: false,
    hasHelper: false
  });
}
function isHelper(node) {
  if (!node) return false;
  if (isMemberExpression(node)) {
    return isHelper(node.object) || isHelper(node.property);
  } else if (isIdentifier(node)) {
    return node.name === "require" || node.name.charCodeAt(0) === 95;
  } else if (isCallExpression(node)) {
    return isHelper(node.callee);
  } else if (isBinary(node) || isAssignmentExpression(node)) {
    return isIdentifier(node.left) && isHelper(node.left) || isHelper(node.right);
  } else {
    return false;
  }
}
function isType(node) {
  return isLiteral(node) || isObjectExpression(node) || isArrayExpression(node) || isIdentifier(node) || isMemberExpression(node);
}
const nodes = exports.nodes = {
  AssignmentExpression(node) {
    const state = crawl(node.right);
    if (state.hasCall && state.hasHelper || state.hasFunction) {
      return state.hasFunction ? 1 | 2 : 2;
    }
  },
  SwitchCase(node, parent) {
    return (!!node.consequent.length || parent.cases[0] === node ? 1 : 0) | (!node.consequent.length && parent.cases[parent.cases.length - 1] === node ? 2 : 0);
  },
  LogicalExpression(node) {
    if (isFunction(node.left) || isFunction(node.right)) {
      return 2;
    }
  },
  Literal(node) {
    if (isStringLiteral(node) && node.value === "use strict") {
      return 2;
    }
  },
  CallExpression(node) {
    if (isFunction(node.callee) || isHelper(node)) {
      return 1 | 2;
    }
  },
  OptionalCallExpression(node) {
    if (isFunction(node.callee)) {
      return 1 | 2;
    }
  },
  VariableDeclaration(node) {
    for (let i = 0; i < node.declarations.length; i++) {
      const declar = node.declarations[i];
      let enabled = isHelper(declar.id) && !isType(declar.init);
      if (!enabled && declar.init) {
        const state = crawl(declar.init);
        enabled = isHelper(declar.init) && state.hasCall || state.hasFunction;
      }
      if (enabled) {
        return 1 | 2;
      }
    }
  },
  IfStatement(node) {
    if (isBlockStatement(node.consequent)) {
      return 1 | 2;
    }
  }
};
nodes.ObjectProperty = nodes.ObjectTypeProperty = nodes.ObjectMethod = function (node, parent) {
  if (parent.properties[0] === node) {
    return 1;
  }
};
nodes.ObjectTypeCallProperty = function (node, parent) {
  var _parent$properties;
  if (parent.callProperties[0] === node && !((_parent$properties = parent.properties) != null && _parent$properties.length)) {
    return 1;
  }
};
nodes.ObjectTypeIndexer = function (node, parent) {
  var _parent$properties2, _parent$callPropertie;
  if (parent.indexers[0] === node && !((_parent$properties2 = parent.properties) != null && _parent$properties2.length) && !((_parent$callPropertie = parent.callProperties) != null && _parent$callPropertie.length)) {
    return 1;
  }
};
nodes.ObjectTypeInternalSlot = function (node, parent) {
  var _parent$properties3, _parent$callPropertie2, _parent$indexers;
  if (parent.internalSlots[0] === node && !((_parent$properties3 = parent.properties) != null && _parent$properties3.length) && !((_parent$callPropertie2 = parent.callProperties) != null && _parent$callPropertie2.length) && !((_parent$indexers = parent.indexers) != null && _parent$indexers.length)) {
    return 1;
  }
};
[["Function", true], ["Class", true], ["Loop", true], ["LabeledStatement", true], ["SwitchStatement", true], ["TryStatement", true]].forEach(function ([type, amounts]) {
  [type].concat(FLIPPED_ALIAS_KEYS[type] || []).forEach(function (type) {
    const ret = amounts ? 1 | 2 : 0;
    nodes[type] = () => ret;
  });
});



},{"@babel/types":69}],18:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _buffer = require("./buffer.js");
var n = require("./node/index.js");
var _t = require("@babel/types");
var generatorFunctions = require("./generators/index.js");
const {
  isFunction,
  isStatement,
  isClassBody,
  isTSInterfaceBody,
  isTSEnumDeclaration
} = _t;
const SCIENTIFIC_NOTATION = /e/i;
const ZERO_DECIMAL_INTEGER = /\.0+$/;
const HAS_NEWLINE = /[\n\r\u2028\u2029]/;
const HAS_NEWLINE_OR_BlOCK_COMMENT_END = /[\n\r\u2028\u2029]|\*\//;
const {
  needsParens
} = n;
class Printer {
  constructor(format, map) {
    this.inForStatementInitCounter = 0;
    this._printStack = [];
    this._indent = 0;
    this._indentRepeat = 0;
    this._insideAux = false;
    this._parenPushNewlineState = null;
    this._noLineTerminator = false;
    this._printAuxAfterOnNextUserNode = false;
    this._printedComments = new Set();
    this._endsWithInteger = false;
    this._endsWithWord = false;
    this._lastCommentLine = 0;
    this._endsWithInnerRaw = false;
    this._indentInnerComments = true;
    this.format = format;
    this._indentRepeat = format.indent.style.length;
    this._inputMap = map == null ? void 0 : map._inputMap;
    this._buf = new _buffer.default(map, format.indent.style[0]);
  }
  generate(ast) {
    this.print(ast);
    this._maybeAddAuxComment();
    return this._buf.get();
  }
  indent() {
    if (this.format.compact || this.format.concise) return;
    this._indent++;
  }
  dedent() {
    if (this.format.compact || this.format.concise) return;
    this._indent--;
  }
  semicolon(force = false) {
    this._maybeAddAuxComment();
    if (force) {
      this._appendChar(59);
    } else {
      this._queue(59);
    }
    this._noLineTerminator = false;
  }
  rightBrace(node) {
    if (this.format.minified) {
      this._buf.removeLastSemicolon();
    }
    this.sourceWithOffset("end", node.loc, -1);
    this.tokenChar(125);
  }
  rightParens(node) {
    this.sourceWithOffset("end", node.loc, -1);
    this.tokenChar(41);
  }
  space(force = false) {
    if (this.format.compact) return;
    if (force) {
      this._space();
    } else if (this._buf.hasContent()) {
      const lastCp = this.getLastChar();
      if (lastCp !== 32 && lastCp !== 10) {
        this._space();
      }
    }
  }
  word(str, noLineTerminatorAfter = false) {
    this._maybePrintInnerComments();
    if (this._endsWithWord || str.charCodeAt(0) === 47 && this.endsWith(47)) {
      this._space();
    }
    this._maybeAddAuxComment();
    this._append(str, false);
    this._endsWithWord = true;
    this._noLineTerminator = noLineTerminatorAfter;
  }
  number(str, number) {
    function isNonDecimalLiteral(str) {
      if (str.length > 2 && str.charCodeAt(0) === 48) {
        const secondChar = str.charCodeAt(1);
        return secondChar === 98 || secondChar === 111 || secondChar === 120;
      }
      return false;
    }
    this.word(str);
    this._endsWithInteger = Number.isInteger(number) && !isNonDecimalLiteral(str) && !SCIENTIFIC_NOTATION.test(str) && !ZERO_DECIMAL_INTEGER.test(str) && str.charCodeAt(str.length - 1) !== 46;
  }
  token(str, maybeNewline = false) {
    this._maybePrintInnerComments();
    const lastChar = this.getLastChar();
    const strFirst = str.charCodeAt(0);
    if (lastChar === 33 && (str === "--" || strFirst === 61) || strFirst === 43 && lastChar === 43 || strFirst === 45 && lastChar === 45 || strFirst === 46 && this._endsWithInteger) {
      this._space();
    }
    this._maybeAddAuxComment();
    this._append(str, maybeNewline);
    this._noLineTerminator = false;
  }
  tokenChar(char) {
    this._maybePrintInnerComments();
    const lastChar = this.getLastChar();
    if (char === 43 && lastChar === 43 || char === 45 && lastChar === 45 || char === 46 && this._endsWithInteger) {
      this._space();
    }
    this._maybeAddAuxComment();
    this._appendChar(char);
    this._noLineTerminator = false;
  }
  newline(i = 1, force) {
    if (i <= 0) return;
    if (!force) {
      if (this.format.retainLines || this.format.compact) return;
      if (this.format.concise) {
        this.space();
        return;
      }
    }
    if (i > 2) i = 2;
    i -= this._buf.getNewlineCount();
    for (let j = 0; j < i; j++) {
      this._newline();
    }
    return;
  }
  endsWith(char) {
    return this.getLastChar() === char;
  }
  getLastChar() {
    return this._buf.getLastChar();
  }
  endsWithCharAndNewline() {
    return this._buf.endsWithCharAndNewline();
  }
  removeTrailingNewline() {
    this._buf.removeTrailingNewline();
  }
  exactSource(loc, cb) {
    if (!loc) {
      cb();
      return;
    }
    this._catchUp("start", loc);
    this._buf.exactSource(loc, cb);
  }
  source(prop, loc) {
    if (!loc) return;
    this._catchUp(prop, loc);
    this._buf.source(prop, loc);
  }
  sourceWithOffset(prop, loc, columnOffset) {
    if (!loc) return;
    this._catchUp(prop, loc);
    this._buf.sourceWithOffset(prop, loc, columnOffset);
  }
  withSource(prop, loc, cb) {
    if (!loc) {
      cb();
      return;
    }
    this._catchUp(prop, loc);
    this._buf.withSource(prop, loc, cb);
  }
  sourceIdentifierName(identifierName, pos) {
    if (!this._buf._canMarkIdName) return;
    const sourcePosition = this._buf._sourcePosition;
    sourcePosition.identifierNamePos = pos;
    sourcePosition.identifierName = identifierName;
  }
  _space() {
    this._queue(32);
  }
  _newline() {
    this._queue(10);
  }
  _append(str, maybeNewline) {
    this._maybeAddParen(str);
    this._maybeIndent(str.charCodeAt(0));
    this._buf.append(str, maybeNewline);
    this._endsWithWord = false;
    this._endsWithInteger = false;
  }
  _appendChar(char) {
    this._maybeAddParenChar(char);
    this._maybeIndent(char);
    this._buf.appendChar(char);
    this._endsWithWord = false;
    this._endsWithInteger = false;
  }
  _queue(char) {
    this._maybeAddParenChar(char);
    this._maybeIndent(char);
    this._buf.queue(char);
    this._endsWithWord = false;
    this._endsWithInteger = false;
  }
  _maybeIndent(firstChar) {
    if (this._indent && firstChar !== 10 && this.endsWith(10)) {
      this._buf.queueIndentation(this._getIndent());
    }
  }
  _shouldIndent(firstChar) {
    if (this._indent && firstChar !== 10 && this.endsWith(10)) {
      return true;
    }
  }
  _maybeAddParenChar(char) {
    const parenPushNewlineState = this._parenPushNewlineState;
    if (!parenPushNewlineState) return;
    if (char === 32) {
      return;
    }
    if (char !== 10) {
      this._parenPushNewlineState = null;
      return;
    }
    this.tokenChar(40);
    this.indent();
    parenPushNewlineState.printed = true;
  }
  _maybeAddParen(str) {
    const parenPushNewlineState = this._parenPushNewlineState;
    if (!parenPushNewlineState) return;
    const len = str.length;
    let i;
    for (i = 0; i < len && str.charCodeAt(i) === 32; i++) continue;
    if (i === len) {
      return;
    }
    const cha = str.charCodeAt(i);
    if (cha !== 10) {
      if (cha !== 47 || i + 1 === len) {
        this._parenPushNewlineState = null;
        return;
      }
      const chaPost = str.charCodeAt(i + 1);
      if (chaPost === 42) {
        return;
      } else if (chaPost !== 47) {
        this._parenPushNewlineState = null;
        return;
      }
    }
    this.tokenChar(40);
    this.indent();
    parenPushNewlineState.printed = true;
  }
  catchUp(line) {
    if (!this.format.retainLines) return;
    const count = line - this._buf.getCurrentLine();
    for (let i = 0; i < count; i++) {
      this._newline();
    }
  }
  _catchUp(prop, loc) {
    var _loc$prop;
    if (!this.format.retainLines) return;
    const line = loc == null || (_loc$prop = loc[prop]) == null ? void 0 : _loc$prop.line;
    if (line != null) {
      const count = line - this._buf.getCurrentLine();
      for (let i = 0; i < count; i++) {
        this._newline();
      }
    }
  }
  _getIndent() {
    return this._indentRepeat * this._indent;
  }
  printTerminatorless(node, parent, isLabel) {
    if (isLabel) {
      this._noLineTerminator = true;
      this.print(node, parent);
    } else {
      const terminatorState = {
        printed: false
      };
      this._parenPushNewlineState = terminatorState;
      this.print(node, parent);
      if (terminatorState.printed) {
        this.dedent();
        this.newline();
        this.tokenChar(41);
      }
    }
  }
  print(node, parent, noLineTerminatorAfter, trailingCommentsLineOffset, forceParens) {
    var _node$extra, _node$leadingComments;
    if (!node) return;
    this._endsWithInnerRaw = false;
    const nodeType = node.type;
    const format = this.format;
    const oldConcise = format.concise;
    if (node._compact) {
      format.concise = true;
    }
    const printMethod = this[nodeType];
    if (printMethod === undefined) {
      throw new ReferenceError(`unknown node of type ${JSON.stringify(nodeType)} with constructor ${JSON.stringify(node.constructor.name)}`);
    }
    this._printStack.push(node);
    const oldInAux = this._insideAux;
    this._insideAux = node.loc == undefined;
    this._maybeAddAuxComment(this._insideAux && !oldInAux);
    const parenthesized = (_node$extra = node.extra) == null ? void 0 : _node$extra.parenthesized;
    let shouldPrintParens = forceParens || parenthesized && format.retainFunctionParens && nodeType === "FunctionExpression" || needsParens(node, parent, this._printStack);
    if (!shouldPrintParens && parenthesized && (_node$leadingComments = node.leadingComments) != null && _node$leadingComments.length && node.leadingComments[0].type === "CommentBlock") {
      const parentType = parent == null ? void 0 : parent.type;
      switch (parentType) {
        case "ExpressionStatement":
        case "VariableDeclarator":
        case "AssignmentExpression":
        case "ReturnStatement":
          break;
        case "CallExpression":
        case "OptionalCallExpression":
        case "NewExpression":
          if (parent.callee !== node) break;
        default:
          shouldPrintParens = true;
      }
    }
    if (shouldPrintParens) {
      this.tokenChar(40);
      this._endsWithInnerRaw = false;
    }
    this._lastCommentLine = 0;
    this._printLeadingComments(node, parent);
    const loc = nodeType === "Program" || nodeType === "File" ? null : node.loc;
    this.exactSource(loc, printMethod.bind(this, node, parent));
    if (shouldPrintParens) {
      this._printTrailingComments(node, parent);
      this.tokenChar(41);
      this._noLineTerminator = noLineTerminatorAfter;
    } else if (noLineTerminatorAfter && !this._noLineTerminator) {
      this._noLineTerminator = true;
      this._printTrailingComments(node, parent);
    } else {
      this._printTrailingComments(node, parent, trailingCommentsLineOffset);
    }
    this._printStack.pop();
    format.concise = oldConcise;
    this._insideAux = oldInAux;
    this._endsWithInnerRaw = false;
  }
  _maybeAddAuxComment(enteredPositionlessNode) {
    if (enteredPositionlessNode) this._printAuxBeforeComment();
    if (!this._insideAux) this._printAuxAfterComment();
  }
  _printAuxBeforeComment() {
    if (this._printAuxAfterOnNextUserNode) return;
    this._printAuxAfterOnNextUserNode = true;
    const comment = this.format.auxiliaryCommentBefore;
    if (comment) {
      this._printComment({
        type: "CommentBlock",
        value: comment
      }, 0);
    }
  }
  _printAuxAfterComment() {
    if (!this._printAuxAfterOnNextUserNode) return;
    this._printAuxAfterOnNextUserNode = false;
    const comment = this.format.auxiliaryCommentAfter;
    if (comment) {
      this._printComment({
        type: "CommentBlock",
        value: comment
      }, 0);
    }
  }
  getPossibleRaw(node) {
    const extra = node.extra;
    if ((extra == null ? void 0 : extra.raw) != null && extra.rawValue != null && node.value === extra.rawValue) {
      return extra.raw;
    }
  }
  printJoin(nodes, parent, opts = {}) {
    if (!(nodes != null && nodes.length)) return;
    let {
      indent
    } = opts;
    if (indent == null && this.format.retainLines) {
      var _nodes$0$loc;
      const startLine = (_nodes$0$loc = nodes[0].loc) == null ? void 0 : _nodes$0$loc.start.line;
      if (startLine != null && startLine !== this._buf.getCurrentLine()) {
        indent = true;
      }
    }
    if (indent) this.indent();
    const newlineOpts = {
      addNewlines: opts.addNewlines,
      nextNodeStartLine: 0
    };
    const separator = opts.separator ? opts.separator.bind(this) : null;
    const len = nodes.length;
    for (let i = 0; i < len; i++) {
      const node = nodes[i];
      if (!node) continue;
      if (opts.statement) this._printNewline(i === 0, newlineOpts);
      this.print(node, parent, undefined, opts.trailingCommentsLineOffset || 0);
      opts.iterator == null || opts.iterator(node, i);
      if (i < len - 1) separator == null || separator();
      if (opts.statement) {
        var _node$trailingComment;
        if (!((_node$trailingComment = node.trailingComments) != null && _node$trailingComment.length)) {
          this._lastCommentLine = 0;
        }
        if (i + 1 === len) {
          this.newline(1);
        } else {
          var _nextNode$loc;
          const nextNode = nodes[i + 1];
          newlineOpts.nextNodeStartLine = ((_nextNode$loc = nextNode.loc) == null ? void 0 : _nextNode$loc.start.line) || 0;
          this._printNewline(true, newlineOpts);
        }
      }
    }
    if (indent) this.dedent();
  }
  printAndIndentOnComments(node, parent) {
    const indent = node.leadingComments && node.leadingComments.length > 0;
    if (indent) this.indent();
    this.print(node, parent);
    if (indent) this.dedent();
  }
  printBlock(parent) {
    const node = parent.body;
    if (node.type !== "EmptyStatement") {
      this.space();
    }
    this.print(node, parent);
  }
  _printTrailingComments(node, parent, lineOffset) {
    const {
      innerComments,
      trailingComments
    } = node;
    if (innerComments != null && innerComments.length) {
      this._printComments(2, innerComments, node, parent, lineOffset);
    }
    if (trailingComments != null && trailingComments.length) {
      this._printComments(2, trailingComments, node, parent, lineOffset);
    }
  }
  _printLeadingComments(node, parent) {
    const comments = node.leadingComments;
    if (!(comments != null && comments.length)) return;
    this._printComments(0, comments, node, parent);
  }
  _maybePrintInnerComments() {
    if (this._endsWithInnerRaw) this.printInnerComments();
    this._endsWithInnerRaw = true;
    this._indentInnerComments = true;
  }
  printInnerComments() {
    const node = this._printStack[this._printStack.length - 1];
    const comments = node.innerComments;
    if (!(comments != null && comments.length)) return;
    const hasSpace = this.endsWith(32);
    const indent = this._indentInnerComments;
    const printedCommentsCount = this._printedComments.size;
    if (indent) this.indent();
    this._printComments(1, comments, node);
    if (hasSpace && printedCommentsCount !== this._printedComments.size) {
      this.space();
    }
    if (indent) this.dedent();
  }
  noIndentInnerCommentsHere() {
    this._indentInnerComments = false;
  }
  printSequence(nodes, parent, opts = {}) {
    var _opts$indent;
    opts.statement = true;
    (_opts$indent = opts.indent) != null ? _opts$indent : opts.indent = false;
    this.printJoin(nodes, parent, opts);
  }
  printList(items, parent, opts = {}) {
    if (opts.separator == null) {
      opts.separator = commaSeparator;
    }
    this.printJoin(items, parent, opts);
  }
  _printNewline(newLine, opts) {
    const format = this.format;
    if (format.retainLines || format.compact) return;
    if (format.concise) {
      this.space();
      return;
    }
    if (!newLine) {
      return;
    }
    const startLine = opts.nextNodeStartLine;
    const lastCommentLine = this._lastCommentLine;
    if (startLine > 0 && lastCommentLine > 0) {
      const offset = startLine - lastCommentLine;
      if (offset >= 0) {
        this.newline(offset || 1);
        return;
      }
    }
    if (this._buf.hasContent()) {
      this.newline(1);
    }
  }
  _shouldPrintComment(comment) {
    if (comment.ignore) return 0;
    if (this._printedComments.has(comment)) return 0;
    if (this._noLineTerminator && HAS_NEWLINE_OR_BlOCK_COMMENT_END.test(comment.value)) {
      return 2;
    }
    this._printedComments.add(comment);
    if (!this.format.shouldPrintComment(comment.value)) {
      return 0;
    }
    return 1;
  }
  _printComment(comment, skipNewLines) {
    const noLineTerminator = this._noLineTerminator;
    const isBlockComment = comment.type === "CommentBlock";
    const printNewLines = isBlockComment && skipNewLines !== 1 && !this._noLineTerminator;
    if (printNewLines && this._buf.hasContent() && skipNewLines !== 2) {
      this.newline(1);
    }
    const lastCharCode = this.getLastChar();
    if (lastCharCode !== 91 && lastCharCode !== 123) {
      this.space();
    }
    let val;
    if (isBlockComment) {
      const {
        _parenPushNewlineState
      } = this;
      if ((_parenPushNewlineState == null ? void 0 : _parenPushNewlineState.printed) === false && HAS_NEWLINE.test(comment.value)) {
        this.tokenChar(40);
        _parenPushNewlineState.printed = true;
      }
      val = `/*${comment.value}*/`;
      if (this.format.indent.adjustMultilineComment) {
        var _comment$loc;
        const offset = (_comment$loc = comment.loc) == null ? void 0 : _comment$loc.start.column;
        if (offset) {
          const newlineRegex = new RegExp("\\n\\s{1," + offset + "}", "g");
          val = val.replace(newlineRegex, "\n");
        }
        if (this.format.concise) {
          val = val.replace(/\n(?!$)/g, `\n`);
        } else {
          let indentSize = this.format.retainLines ? 0 : this._buf.getCurrentColumn();
          if (this._shouldIndent(47) || this.format.retainLines) {
            indentSize += this._getIndent();
          }
          val = val.replace(/\n(?!$)/g, `\n${" ".repeat(indentSize)}`);
        }
      }
    } else if (!noLineTerminator) {
      val = `//${comment.value}`;
    } else {
      val = `/*${comment.value}*/`;
    }
    if (this.endsWith(47)) this._space();
    this.source("start", comment.loc);
    this._append(val, isBlockComment);
    if (!isBlockComment && !noLineTerminator) {
      this.newline(1, true);
    }
    if (printNewLines && skipNewLines !== 3) {
      this.newline(1);
    }
  }
  _printComments(type, comments, node, parent, lineOffset = 0) {
    const nodeLoc = node.loc;
    const len = comments.length;
    let hasLoc = !!nodeLoc;
    const nodeStartLine = hasLoc ? nodeLoc.start.line : 0;
    const nodeEndLine = hasLoc ? nodeLoc.end.line : 0;
    let lastLine = 0;
    let leadingCommentNewline = 0;
    const maybeNewline = this._noLineTerminator ? function () {} : this.newline.bind(this);
    for (let i = 0; i < len; i++) {
      const comment = comments[i];
      const shouldPrint = this._shouldPrintComment(comment);
      if (shouldPrint === 2) {
        hasLoc = false;
        break;
      }
      if (hasLoc && comment.loc && shouldPrint === 1) {
        const commentStartLine = comment.loc.start.line;
        const commentEndLine = comment.loc.end.line;
        if (type === 0) {
          let offset = 0;
          if (i === 0) {
            if (this._buf.hasContent() && (comment.type === "CommentLine" || commentStartLine != commentEndLine)) {
              offset = leadingCommentNewline = 1;
            }
          } else {
            offset = commentStartLine - lastLine;
          }
          lastLine = commentEndLine;
          maybeNewline(offset);
          this._printComment(comment, 1);
          if (i + 1 === len) {
            maybeNewline(Math.max(nodeStartLine - lastLine, leadingCommentNewline));
            lastLine = nodeStartLine;
          }
        } else if (type === 1) {
          const offset = commentStartLine - (i === 0 ? nodeStartLine : lastLine);
          lastLine = commentEndLine;
          maybeNewline(offset);
          this._printComment(comment, 1);
          if (i + 1 === len) {
            maybeNewline(Math.min(1, nodeEndLine - lastLine));
            lastLine = nodeEndLine;
          }
        } else {
          const offset = commentStartLine - (i === 0 ? nodeEndLine - lineOffset : lastLine);
          lastLine = commentEndLine;
          maybeNewline(offset);
          this._printComment(comment, 1);
        }
      } else {
        hasLoc = false;
        if (shouldPrint !== 1) {
          continue;
        }
        if (len === 1) {
          const singleLine = comment.loc ? comment.loc.start.line === comment.loc.end.line : !HAS_NEWLINE.test(comment.value);
          const shouldSkipNewline = singleLine && !isStatement(node) && !isClassBody(parent) && !isTSInterfaceBody(parent) && !isTSEnumDeclaration(parent);
          if (type === 0) {
            this._printComment(comment, shouldSkipNewline && node.type !== "ObjectExpression" || singleLine && isFunction(parent, {
              body: node
            }) ? 1 : 0);
          } else if (shouldSkipNewline && type === 2) {
            this._printComment(comment, 1);
          } else {
            this._printComment(comment, 0);
          }
        } else if (type === 1 && !(node.type === "ObjectExpression" && node.properties.length > 1) && node.type !== "ClassBody" && node.type !== "TSInterfaceBody") {
          this._printComment(comment, i === 0 ? 2 : i === len - 1 ? 3 : 0);
        } else {
          this._printComment(comment, 0);
        }
      }
    }
    if (type === 2 && hasLoc && lastLine) {
      this._lastCommentLine = lastLine;
    }
  }
}
Object.assign(Printer.prototype, generatorFunctions);
{
  Printer.prototype.Noop = function Noop() {};
}
var _default = exports.default = Printer;
function commaSeparator() {
  this.tokenChar(44);
  this.space();
}



},{"./buffer.js":1,"./generators/index.js":6,"./node/index.js":15,"@babel/types":69}],19:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _genMapping = require("@jridgewell/gen-mapping");
var _traceMapping = require("@jridgewell/trace-mapping");
class SourceMap {
  constructor(opts, code) {
    var _opts$sourceFileName;
    this._map = void 0;
    this._rawMappings = void 0;
    this._sourceFileName = void 0;
    this._lastGenLine = 0;
    this._lastSourceLine = 0;
    this._lastSourceColumn = 0;
    this._inputMap = void 0;
    const map = this._map = new _genMapping.GenMapping({
      sourceRoot: opts.sourceRoot
    });
    this._sourceFileName = (_opts$sourceFileName = opts.sourceFileName) == null ? void 0 : _opts$sourceFileName.replace(/\\/g, "/");
    this._rawMappings = undefined;
    if (opts.inputSourceMap) {
      this._inputMap = new _traceMapping.TraceMap(opts.inputSourceMap);
      const resolvedSources = this._inputMap.resolvedSources;
      if (resolvedSources.length) {
        for (let i = 0; i < resolvedSources.length; i++) {
          var _this$_inputMap$sourc;
          (0, _genMapping.setSourceContent)(map, resolvedSources[i], (_this$_inputMap$sourc = this._inputMap.sourcesContent) == null ? void 0 : _this$_inputMap$sourc[i]);
        }
      }
    }
    if (typeof code === "string" && !opts.inputSourceMap) {
      (0, _genMapping.setSourceContent)(map, this._sourceFileName, code);
    } else if (typeof code === "object") {
      for (const sourceFileName of Object.keys(code)) {
        (0, _genMapping.setSourceContent)(map, sourceFileName.replace(/\\/g, "/"), code[sourceFileName]);
      }
    }
  }
  get() {
    return (0, _genMapping.toEncodedMap)(this._map);
  }
  getDecoded() {
    return (0, _genMapping.toDecodedMap)(this._map);
  }
  getRawMappings() {
    return this._rawMappings || (this._rawMappings = (0, _genMapping.allMappings)(this._map));
  }
  mark(generated, line, column, identifierName, identifierNamePos, filename) {
    var _originalMapping;
    this._rawMappings = undefined;
    let originalMapping;
    if (line != null) {
      if (this._inputMap) {
        originalMapping = (0, _traceMapping.originalPositionFor)(this._inputMap, {
          line,
          column
        });
        if (!originalMapping.name && identifierNamePos) {
          const originalIdentifierMapping = (0, _traceMapping.originalPositionFor)(this._inputMap, identifierNamePos);
          if (originalIdentifierMapping.name) {
            identifierName = originalIdentifierMapping.name;
          }
        }
      } else {
        originalMapping = {
          source: (filename == null ? void 0 : filename.replace(/\\/g, "/")) || this._sourceFileName,
          line: line,
          column: column
        };
      }
    }
    (0, _genMapping.maybeAddMapping)(this._map, {
      name: identifierName,
      generated,
      source: (_originalMapping = originalMapping) == null ? void 0 : _originalMapping.source,
      original: originalMapping
    });
  }
}
exports.default = SourceMap;



},{"@jridgewell/gen-mapping":106,"@jridgewell/trace-mapping":110}],20:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.readCodePoint = readCodePoint;
exports.readInt = readInt;
exports.readStringContents = readStringContents;
var _isDigit = function isDigit(code) {
  return code >= 48 && code <= 57;
};
const forbiddenNumericSeparatorSiblings = {
  decBinOct: new Set([46, 66, 69, 79, 95, 98, 101, 111]),
  hex: new Set([46, 88, 95, 120])
};
const isAllowedNumericSeparatorSibling = {
  bin: ch => ch === 48 || ch === 49,
  oct: ch => ch >= 48 && ch <= 55,
  dec: ch => ch >= 48 && ch <= 57,
  hex: ch => ch >= 48 && ch <= 57 || ch >= 65 && ch <= 70 || ch >= 97 && ch <= 102
};
function readStringContents(type, input, pos, lineStart, curLine, errors) {
  const initialPos = pos;
  const initialLineStart = lineStart;
  const initialCurLine = curLine;
  let out = "";
  let firstInvalidLoc = null;
  let chunkStart = pos;
  const {
    length
  } = input;
  for (;;) {
    if (pos >= length) {
      errors.unterminated(initialPos, initialLineStart, initialCurLine);
      out += input.slice(chunkStart, pos);
      break;
    }
    const ch = input.charCodeAt(pos);
    if (isStringEnd(type, ch, input, pos)) {
      out += input.slice(chunkStart, pos);
      break;
    }
    if (ch === 92) {
      out += input.slice(chunkStart, pos);
      const res = readEscapedChar(input, pos, lineStart, curLine, type === "template", errors);
      if (res.ch === null && !firstInvalidLoc) {
        firstInvalidLoc = {
          pos,
          lineStart,
          curLine
        };
      } else {
        out += res.ch;
      }
      ({
        pos,
        lineStart,
        curLine
      } = res);
      chunkStart = pos;
    } else if (ch === 8232 || ch === 8233) {
      ++pos;
      ++curLine;
      lineStart = pos;
    } else if (ch === 10 || ch === 13) {
      if (type === "template") {
        out += input.slice(chunkStart, pos) + "\n";
        ++pos;
        if (ch === 13 && input.charCodeAt(pos) === 10) {
          ++pos;
        }
        ++curLine;
        chunkStart = lineStart = pos;
      } else {
        errors.unterminated(initialPos, initialLineStart, initialCurLine);
      }
    } else {
      ++pos;
    }
  }
  return {
    pos,
    str: out,
    firstInvalidLoc,
    lineStart,
    curLine,
    containsInvalid: !!firstInvalidLoc
  };
}
function isStringEnd(type, ch, input, pos) {
  if (type === "template") {
    return ch === 96 || ch === 36 && input.charCodeAt(pos + 1) === 123;
  }
  return ch === (type === "double" ? 34 : 39);
}
function readEscapedChar(input, pos, lineStart, curLine, inTemplate, errors) {
  const throwOnInvalid = !inTemplate;
  pos++;
  const res = ch => ({
    pos,
    ch,
    lineStart,
    curLine
  });
  const ch = input.charCodeAt(pos++);
  switch (ch) {
    case 110:
      return res("\n");
    case 114:
      return res("\r");
    case 120:
      {
        let code;
        ({
          code,
          pos
        } = readHexChar(input, pos, lineStart, curLine, 2, false, throwOnInvalid, errors));
        return res(code === null ? null : String.fromCharCode(code));
      }
    case 117:
      {
        let code;
        ({
          code,
          pos
        } = readCodePoint(input, pos, lineStart, curLine, throwOnInvalid, errors));
        return res(code === null ? null : String.fromCodePoint(code));
      }
    case 116:
      return res("\t");
    case 98:
      return res("\b");
    case 118:
      return res("\u000b");
    case 102:
      return res("\f");
    case 13:
      if (input.charCodeAt(pos) === 10) {
        ++pos;
      }
    case 10:
      lineStart = pos;
      ++curLine;
    case 8232:
    case 8233:
      return res("");
    case 56:
    case 57:
      if (inTemplate) {
        return res(null);
      } else {
        errors.strictNumericEscape(pos - 1, lineStart, curLine);
      }
    default:
      if (ch >= 48 && ch <= 55) {
        const startPos = pos - 1;
        const match = input.slice(startPos, pos + 2).match(/^[0-7]+/);
        let octalStr = match[0];
        let octal = parseInt(octalStr, 8);
        if (octal > 255) {
          octalStr = octalStr.slice(0, -1);
          octal = parseInt(octalStr, 8);
        }
        pos += octalStr.length - 1;
        const next = input.charCodeAt(pos);
        if (octalStr !== "0" || next === 56 || next === 57) {
          if (inTemplate) {
            return res(null);
          } else {
            errors.strictNumericEscape(startPos, lineStart, curLine);
          }
        }
        return res(String.fromCharCode(octal));
      }
      return res(String.fromCharCode(ch));
  }
}
function readHexChar(input, pos, lineStart, curLine, len, forceLen, throwOnInvalid, errors) {
  const initialPos = pos;
  let n;
  ({
    n,
    pos
  } = readInt(input, pos, lineStart, curLine, 16, len, forceLen, false, errors, !throwOnInvalid));
  if (n === null) {
    if (throwOnInvalid) {
      errors.invalidEscapeSequence(initialPos, lineStart, curLine);
    } else {
      pos = initialPos - 1;
    }
  }
  return {
    code: n,
    pos
  };
}
function readInt(input, pos, lineStart, curLine, radix, len, forceLen, allowNumSeparator, errors, bailOnError) {
  const start = pos;
  const forbiddenSiblings = radix === 16 ? forbiddenNumericSeparatorSiblings.hex : forbiddenNumericSeparatorSiblings.decBinOct;
  const isAllowedSibling = radix === 16 ? isAllowedNumericSeparatorSibling.hex : radix === 10 ? isAllowedNumericSeparatorSibling.dec : radix === 8 ? isAllowedNumericSeparatorSibling.oct : isAllowedNumericSeparatorSibling.bin;
  let invalid = false;
  let total = 0;
  for (let i = 0, e = len == null ? Infinity : len; i < e; ++i) {
    const code = input.charCodeAt(pos);
    let val;
    if (code === 95 && allowNumSeparator !== "bail") {
      const prev = input.charCodeAt(pos - 1);
      const next = input.charCodeAt(pos + 1);
      if (!allowNumSeparator) {
        if (bailOnError) return {
          n: null,
          pos
        };
        errors.numericSeparatorInEscapeSequence(pos, lineStart, curLine);
      } else if (Number.isNaN(next) || !isAllowedSibling(next) || forbiddenSiblings.has(prev) || forbiddenSiblings.has(next)) {
        if (bailOnError) return {
          n: null,
          pos
        };
        errors.unexpectedNumericSeparator(pos, lineStart, curLine);
      }
      ++pos;
      continue;
    }
    if (code >= 97) {
      val = code - 97 + 10;
    } else if (code >= 65) {
      val = code - 65 + 10;
    } else if (_isDigit(code)) {
      val = code - 48;
    } else {
      val = Infinity;
    }
    if (val >= radix) {
      if (val <= 9 && bailOnError) {
        return {
          n: null,
          pos
        };
      } else if (val <= 9 && errors.invalidDigit(pos, lineStart, curLine, radix)) {
        val = 0;
      } else if (forceLen) {
        val = 0;
        invalid = true;
      } else {
        break;
      }
    }
    ++pos;
    total = total * radix + val;
  }
  if (pos === start || len != null && pos - start !== len || invalid) {
    return {
      n: null,
      pos
    };
  }
  return {
    n: total,
    pos
  };
}
function readCodePoint(input, pos, lineStart, curLine, throwOnInvalid, errors) {
  const ch = input.charCodeAt(pos);
  let code;
  if (ch === 123) {
    ++pos;
    ({
      code,
      pos
    } = readHexChar(input, pos, lineStart, curLine, input.indexOf("}", pos) - pos, true, throwOnInvalid, errors));
    ++pos;
    if (code !== null && code > 0x10ffff) {
      if (throwOnInvalid) {
        errors.invalidCodePoint(pos, lineStart, curLine);
      } else {
        return {
          code: null,
          pos
        };
      }
    }
  } else {
    ({
      code,
      pos
    } = readHexChar(input, pos, lineStart, curLine, 4, false, throwOnInvalid, errors));
  }
  return {
    code,
    pos
  };
}



},{}],21:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isIdentifierChar = isIdentifierChar;
exports.isIdentifierName = isIdentifierName;
exports.isIdentifierStart = isIdentifierStart;
let nonASCIIidentifierStartChars = "\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u037f\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u052f\u0531-\u0556\u0559\u0560-\u0588\u05d0-\u05ea\u05ef-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u0860-\u086a\u0870-\u0887\u0889-\u088e\u08a0-\u08c9\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u09fc\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0af9\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d\u0c58-\u0c5a\u0c5d\u0c60\u0c61\u0c80\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cdd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d04-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d54-\u0d56\u0d5f-\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e86-\u0e8a\u0e8c-\u0ea3\u0ea5\u0ea7-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u1711\u171f-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1878\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191e\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4c\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1c80-\u1c88\u1c90-\u1cba\u1cbd-\u1cbf\u1ce9-\u1cec\u1cee-\u1cf3\u1cf5\u1cf6\u1cfa\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309b-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312f\u3131-\u318e\u31a0-\u31bf\u31f0-\u31ff\u3400-\u4dbf\u4e00-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua69d\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua7ca\ua7d0\ua7d1\ua7d3\ua7d5-\ua7d9\ua7f2-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua8fd\ua8fe\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\ua9e0-\ua9e4\ua9e6-\ua9ef\ua9fa-\ua9fe\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa7e-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab69\uab70-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc";
let nonASCIIidentifierChars = "\u200c\u200d\xb7\u0300-\u036f\u0387\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u0669\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7\u06e8\u06ea-\u06ed\u06f0-\u06f9\u0711\u0730-\u074a\u07a6-\u07b0\u07c0-\u07c9\u07eb-\u07f3\u07fd\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0859-\u085b\u0898-\u089f\u08ca-\u08e1\u08e3-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09cb-\u09cd\u09d7\u09e2\u09e3\u09e6-\u09ef\u09fe\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2\u0ae3\u0ae6-\u0aef\u0afa-\u0aff\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b55-\u0b57\u0b62\u0b63\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c00-\u0c04\u0c3c\u0c3e-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0c66-\u0c6f\u0c81-\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0ce6-\u0cef\u0cf3\u0d00-\u0d03\u0d3b\u0d3c\u0d3e-\u0d44\u0d46-\u0d48\u0d4a-\u0d4d\u0d57\u0d62\u0d63\u0d66-\u0d6f\u0d81-\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0de6-\u0def\u0df2\u0df3\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0e50-\u0e59\u0eb1\u0eb4-\u0ebc\u0ec8-\u0ece\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e\u0f3f\u0f71-\u0f84\u0f86\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u102b-\u103e\u1040-\u1049\u1056-\u1059\u105e-\u1060\u1062-\u1064\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u1369-\u1371\u1712-\u1715\u1732-\u1734\u1752\u1753\u1772\u1773\u17b4-\u17d3\u17dd\u17e0-\u17e9\u180b-\u180d\u180f-\u1819\u18a9\u1920-\u192b\u1930-\u193b\u1946-\u194f\u19d0-\u19da\u1a17-\u1a1b\u1a55-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1ab0-\u1abd\u1abf-\u1ace\u1b00-\u1b04\u1b34-\u1b44\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1b82\u1ba1-\u1bad\u1bb0-\u1bb9\u1be6-\u1bf3\u1c24-\u1c37\u1c40-\u1c49\u1c50-\u1c59\u1cd0-\u1cd2\u1cd4-\u1ce8\u1ced\u1cf4\u1cf7-\u1cf9\u1dc0-\u1dff\u200c\u200d\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2cef-\u2cf1\u2d7f\u2de0-\u2dff\u302a-\u302f\u3099\u309a\u30fb\ua620-\ua629\ua66f\ua674-\ua67d\ua69e\ua69f\ua6f0\ua6f1\ua802\ua806\ua80b\ua823-\ua827\ua82c\ua880\ua881\ua8b4-\ua8c5\ua8d0-\ua8d9\ua8e0-\ua8f1\ua8ff-\ua909\ua926-\ua92d\ua947-\ua953\ua980-\ua983\ua9b3-\ua9c0\ua9d0-\ua9d9\ua9e5\ua9f0-\ua9f9\uaa29-\uaa36\uaa43\uaa4c\uaa4d\uaa50-\uaa59\uaa7b-\uaa7d\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uaaeb-\uaaef\uaaf5\uaaf6\uabe3-\uabea\uabec\uabed\uabf0-\uabf9\ufb1e\ufe00-\ufe0f\ufe20-\ufe2f\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f\uff65";
const nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]");
const nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");
nonASCIIidentifierStartChars = nonASCIIidentifierChars = null;
const astralIdentifierStartCodes = [0, 11, 2, 25, 2, 18, 2, 1, 2, 14, 3, 13, 35, 122, 70, 52, 268, 28, 4, 48, 48, 31, 14, 29, 6, 37, 11, 29, 3, 35, 5, 7, 2, 4, 43, 157, 19, 35, 5, 35, 5, 39, 9, 51, 13, 10, 2, 14, 2, 6, 2, 1, 2, 10, 2, 14, 2, 6, 2, 1, 68, 310, 10, 21, 11, 7, 25, 5, 2, 41, 2, 8, 70, 5, 3, 0, 2, 43, 2, 1, 4, 0, 3, 22, 11, 22, 10, 30, 66, 18, 2, 1, 11, 21, 11, 25, 71, 55, 7, 1, 65, 0, 16, 3, 2, 2, 2, 28, 43, 28, 4, 28, 36, 7, 2, 27, 28, 53, 11, 21, 11, 18, 14, 17, 111, 72, 56, 50, 14, 50, 14, 35, 349, 41, 7, 1, 79, 28, 11, 0, 9, 21, 43, 17, 47, 20, 28, 22, 13, 52, 58, 1, 3, 0, 14, 44, 33, 24, 27, 35, 30, 0, 3, 0, 9, 34, 4, 0, 13, 47, 15, 3, 22, 0, 2, 0, 36, 17, 2, 24, 20, 1, 64, 6, 2, 0, 2, 3, 2, 14, 2, 9, 8, 46, 39, 7, 3, 1, 3, 21, 2, 6, 2, 1, 2, 4, 4, 0, 19, 0, 13, 4, 159, 52, 19, 3, 21, 2, 31, 47, 21, 1, 2, 0, 185, 46, 42, 3, 37, 47, 21, 0, 60, 42, 14, 0, 72, 26, 38, 6, 186, 43, 117, 63, 32, 7, 3, 0, 3, 7, 2, 1, 2, 23, 16, 0, 2, 0, 95, 7, 3, 38, 17, 0, 2, 0, 29, 0, 11, 39, 8, 0, 22, 0, 12, 45, 20, 0, 19, 72, 264, 8, 2, 36, 18, 0, 50, 29, 113, 6, 2, 1, 2, 37, 22, 0, 26, 5, 2, 1, 2, 31, 15, 0, 328, 18, 16, 0, 2, 12, 2, 33, 125, 0, 80, 921, 103, 110, 18, 195, 2637, 96, 16, 1071, 18, 5, 4026, 582, 8634, 568, 8, 30, 18, 78, 18, 29, 19, 47, 17, 3, 32, 20, 6, 18, 689, 63, 129, 74, 6, 0, 67, 12, 65, 1, 2, 0, 29, 6135, 9, 1237, 43, 8, 8936, 3, 2, 6, 2, 1, 2, 290, 16, 0, 30, 2, 3, 0, 15, 3, 9, 395, 2309, 106, 6, 12, 4, 8, 8, 9, 5991, 84, 2, 70, 2, 1, 3, 0, 3, 1, 3, 3, 2, 11, 2, 0, 2, 6, 2, 64, 2, 3, 3, 7, 2, 6, 2, 27, 2, 3, 2, 4, 2, 0, 4, 6, 2, 339, 3, 24, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 7, 1845, 30, 7, 5, 262, 61, 147, 44, 11, 6, 17, 0, 322, 29, 19, 43, 485, 27, 757, 6, 2, 3, 2, 1, 2, 14, 2, 196, 60, 67, 8, 0, 1205, 3, 2, 26, 2, 1, 2, 0, 3, 0, 2, 9, 2, 3, 2, 0, 2, 0, 7, 0, 5, 0, 2, 0, 2, 0, 2, 2, 2, 1, 2, 0, 3, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 1, 2, 0, 3, 3, 2, 6, 2, 3, 2, 3, 2, 0, 2, 9, 2, 16, 6, 2, 2, 4, 2, 16, 4421, 42719, 33, 4153, 7, 221, 3, 5761, 15, 7472, 16, 621, 2467, 541, 1507, 4938, 6, 4191];
const astralIdentifierCodes = [509, 0, 227, 0, 150, 4, 294, 9, 1368, 2, 2, 1, 6, 3, 41, 2, 5, 0, 166, 1, 574, 3, 9, 9, 370, 1, 81, 2, 71, 10, 50, 3, 123, 2, 54, 14, 32, 10, 3, 1, 11, 3, 46, 10, 8, 0, 46, 9, 7, 2, 37, 13, 2, 9, 6, 1, 45, 0, 13, 2, 49, 13, 9, 3, 2, 11, 83, 11, 7, 0, 3, 0, 158, 11, 6, 9, 7, 3, 56, 1, 2, 6, 3, 1, 3, 2, 10, 0, 11, 1, 3, 6, 4, 4, 193, 17, 10, 9, 5, 0, 82, 19, 13, 9, 214, 6, 3, 8, 28, 1, 83, 16, 16, 9, 82, 12, 9, 9, 84, 14, 5, 9, 243, 14, 166, 9, 71, 5, 2, 1, 3, 3, 2, 0, 2, 1, 13, 9, 120, 6, 3, 6, 4, 0, 29, 9, 41, 6, 2, 3, 9, 0, 10, 10, 47, 15, 406, 7, 2, 7, 17, 9, 57, 21, 2, 13, 123, 5, 4, 0, 2, 1, 2, 6, 2, 0, 9, 9, 49, 4, 2, 1, 2, 4, 9, 9, 330, 3, 10, 1, 2, 0, 49, 6, 4, 4, 14, 9, 5351, 0, 7, 14, 13835, 9, 87, 9, 39, 4, 60, 6, 26, 9, 1014, 0, 2, 54, 8, 3, 82, 0, 12, 1, 19628, 1, 4706, 45, 3, 22, 543, 4, 4, 5, 9, 7, 3, 6, 31, 3, 149, 2, 1418, 49, 513, 54, 5, 49, 9, 0, 15, 0, 23, 4, 2, 14, 1361, 6, 2, 16, 3, 6, 2, 1, 2, 4, 101, 0, 161, 6, 10, 9, 357, 0, 62, 13, 499, 13, 983, 6, 110, 6, 6, 9, 4759, 9, 787719, 239];
function isInAstralSet(code, set) {
  let pos = 0x10000;
  for (let i = 0, length = set.length; i < length; i += 2) {
    pos += set[i];
    if (pos > code) return false;
    pos += set[i + 1];
    if (pos >= code) return true;
  }
  return false;
}
function isIdentifierStart(code) {
  if (code < 65) return code === 36;
  if (code <= 90) return true;
  if (code < 97) return code === 95;
  if (code <= 122) return true;
  if (code <= 0xffff) {
    return code >= 0xaa && nonASCIIidentifierStart.test(String.fromCharCode(code));
  }
  return isInAstralSet(code, astralIdentifierStartCodes);
}
function isIdentifierChar(code) {
  if (code < 48) return code === 36;
  if (code < 58) return true;
  if (code < 65) return false;
  if (code <= 90) return true;
  if (code < 97) return code === 95;
  if (code <= 122) return true;
  if (code <= 0xffff) {
    return code >= 0xaa && nonASCIIidentifier.test(String.fromCharCode(code));
  }
  return isInAstralSet(code, astralIdentifierStartCodes) || isInAstralSet(code, astralIdentifierCodes);
}
function isIdentifierName(name) {
  let isFirst = true;
  for (let i = 0; i < name.length; i++) {
    let cp = name.charCodeAt(i);
    if ((cp & 0xfc00) === 0xd800 && i + 1 < name.length) {
      const trail = name.charCodeAt(++i);
      if ((trail & 0xfc00) === 0xdc00) {
        cp = 0x10000 + ((cp & 0x3ff) << 10) + (trail & 0x3ff);
      }
    }
    if (isFirst) {
      isFirst = false;
      if (!isIdentifierStart(cp)) {
        return false;
      }
    } else if (!isIdentifierChar(cp)) {
      return false;
    }
  }
  return !isFirst;
}



},{}],22:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "isIdentifierChar", {
  enumerable: true,
  get: function () {
    return _identifier.isIdentifierChar;
  }
});
Object.defineProperty(exports, "isIdentifierName", {
  enumerable: true,
  get: function () {
    return _identifier.isIdentifierName;
  }
});
Object.defineProperty(exports, "isIdentifierStart", {
  enumerable: true,
  get: function () {
    return _identifier.isIdentifierStart;
  }
});
Object.defineProperty(exports, "isKeyword", {
  enumerable: true,
  get: function () {
    return _keyword.isKeyword;
  }
});
Object.defineProperty(exports, "isReservedWord", {
  enumerable: true,
  get: function () {
    return _keyword.isReservedWord;
  }
});
Object.defineProperty(exports, "isStrictBindOnlyReservedWord", {
  enumerable: true,
  get: function () {
    return _keyword.isStrictBindOnlyReservedWord;
  }
});
Object.defineProperty(exports, "isStrictBindReservedWord", {
  enumerable: true,
  get: function () {
    return _keyword.isStrictBindReservedWord;
  }
});
Object.defineProperty(exports, "isStrictReservedWord", {
  enumerable: true,
  get: function () {
    return _keyword.isStrictReservedWord;
  }
});
var _identifier = require("./identifier.js");
var _keyword = require("./keyword.js");



},{"./identifier.js":21,"./keyword.js":23}],23:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isKeyword = isKeyword;
exports.isReservedWord = isReservedWord;
exports.isStrictBindOnlyReservedWord = isStrictBindOnlyReservedWord;
exports.isStrictBindReservedWord = isStrictBindReservedWord;
exports.isStrictReservedWord = isStrictReservedWord;
const reservedWords = {
  keyword: ["break", "case", "catch", "continue", "debugger", "default", "do", "else", "finally", "for", "function", "if", "return", "switch", "throw", "try", "var", "const", "while", "with", "new", "this", "super", "class", "extends", "export", "import", "null", "true", "false", "in", "instanceof", "typeof", "void", "delete"],
  strict: ["implements", "interface", "let", "package", "private", "protected", "public", "static", "yield"],
  strictBind: ["eval", "arguments"]
};
const keywords = new Set(reservedWords.keyword);
const reservedWordsStrictSet = new Set(reservedWords.strict);
const reservedWordsStrictBindSet = new Set(reservedWords.strictBind);
function isReservedWord(word, inModule) {
  return inModule && word === "await" || word === "enum";
}
function isStrictReservedWord(word, inModule) {
  return isReservedWord(word, inModule) || reservedWordsStrictSet.has(word);
}
function isStrictBindOnlyReservedWord(word) {
  return reservedWordsStrictBindSet.has(word);
}
function isStrictBindReservedWord(word, inModule) {
  return isStrictReservedWord(word, inModule) || isStrictBindOnlyReservedWord(word);
}
function isKeyword(word) {
  return keywords.has(word);
}



},{}],24:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = assertNode;
var _isNode = require("../validators/isNode.js");
function assertNode(node) {
  if (!(0, _isNode.default)(node)) {
    var _node$type;
    const type = (_node$type = node == null ? void 0 : node.type) != null ? _node$type : JSON.stringify(node);
    throw new TypeError(`Not a valid node of type "${type}"`);
  }
}



},{"../validators/isNode.js":92}],25:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.assertAccessor = assertAccessor;
exports.assertAnyTypeAnnotation = assertAnyTypeAnnotation;
exports.assertArgumentPlaceholder = assertArgumentPlaceholder;
exports.assertArrayExpression = assertArrayExpression;
exports.assertArrayPattern = assertArrayPattern;
exports.assertArrayTypeAnnotation = assertArrayTypeAnnotation;
exports.assertArrowFunctionExpression = assertArrowFunctionExpression;
exports.assertAssignmentExpression = assertAssignmentExpression;
exports.assertAssignmentPattern = assertAssignmentPattern;
exports.assertAwaitExpression = assertAwaitExpression;
exports.assertBigIntLiteral = assertBigIntLiteral;
exports.assertBinary = assertBinary;
exports.assertBinaryExpression = assertBinaryExpression;
exports.assertBindExpression = assertBindExpression;
exports.assertBlock = assertBlock;
exports.assertBlockParent = assertBlockParent;
exports.assertBlockStatement = assertBlockStatement;
exports.assertBooleanLiteral = assertBooleanLiteral;
exports.assertBooleanLiteralTypeAnnotation = assertBooleanLiteralTypeAnnotation;
exports.assertBooleanTypeAnnotation = assertBooleanTypeAnnotation;
exports.assertBreakStatement = assertBreakStatement;
exports.assertCallExpression = assertCallExpression;
exports.assertCatchClause = assertCatchClause;
exports.assertClass = assertClass;
exports.assertClassAccessorProperty = assertClassAccessorProperty;
exports.assertClassBody = assertClassBody;
exports.assertClassDeclaration = assertClassDeclaration;
exports.assertClassExpression = assertClassExpression;
exports.assertClassImplements = assertClassImplements;
exports.assertClassMethod = assertClassMethod;
exports.assertClassPrivateMethod = assertClassPrivateMethod;
exports.assertClassPrivateProperty = assertClassPrivateProperty;
exports.assertClassProperty = assertClassProperty;
exports.assertCompletionStatement = assertCompletionStatement;
exports.assertConditional = assertConditional;
exports.assertConditionalExpression = assertConditionalExpression;
exports.assertContinueStatement = assertContinueStatement;
exports.assertDebuggerStatement = assertDebuggerStatement;
exports.assertDecimalLiteral = assertDecimalLiteral;
exports.assertDeclaration = assertDeclaration;
exports.assertDeclareClass = assertDeclareClass;
exports.assertDeclareExportAllDeclaration = assertDeclareExportAllDeclaration;
exports.assertDeclareExportDeclaration = assertDeclareExportDeclaration;
exports.assertDeclareFunction = assertDeclareFunction;
exports.assertDeclareInterface = assertDeclareInterface;
exports.assertDeclareModule = assertDeclareModule;
exports.assertDeclareModuleExports = assertDeclareModuleExports;
exports.assertDeclareOpaqueType = assertDeclareOpaqueType;
exports.assertDeclareTypeAlias = assertDeclareTypeAlias;
exports.assertDeclareVariable = assertDeclareVariable;
exports.assertDeclaredPredicate = assertDeclaredPredicate;
exports.assertDecorator = assertDecorator;
exports.assertDirective = assertDirective;
exports.assertDirectiveLiteral = assertDirectiveLiteral;
exports.assertDoExpression = assertDoExpression;
exports.assertDoWhileStatement = assertDoWhileStatement;
exports.assertEmptyStatement = assertEmptyStatement;
exports.assertEmptyTypeAnnotation = assertEmptyTypeAnnotation;
exports.assertEnumBody = assertEnumBody;
exports.assertEnumBooleanBody = assertEnumBooleanBody;
exports.assertEnumBooleanMember = assertEnumBooleanMember;
exports.assertEnumDeclaration = assertEnumDeclaration;
exports.assertEnumDefaultedMember = assertEnumDefaultedMember;
exports.assertEnumMember = assertEnumMember;
exports.assertEnumNumberBody = assertEnumNumberBody;
exports.assertEnumNumberMember = assertEnumNumberMember;
exports.assertEnumStringBody = assertEnumStringBody;
exports.assertEnumStringMember = assertEnumStringMember;
exports.assertEnumSymbolBody = assertEnumSymbolBody;
exports.assertExistsTypeAnnotation = assertExistsTypeAnnotation;
exports.assertExportAllDeclaration = assertExportAllDeclaration;
exports.assertExportDeclaration = assertExportDeclaration;
exports.assertExportDefaultDeclaration = assertExportDefaultDeclaration;
exports.assertExportDefaultSpecifier = assertExportDefaultSpecifier;
exports.assertExportNamedDeclaration = assertExportNamedDeclaration;
exports.assertExportNamespaceSpecifier = assertExportNamespaceSpecifier;
exports.assertExportSpecifier = assertExportSpecifier;
exports.assertExpression = assertExpression;
exports.assertExpressionStatement = assertExpressionStatement;
exports.assertExpressionWrapper = assertExpressionWrapper;
exports.assertFile = assertFile;
exports.assertFlow = assertFlow;
exports.assertFlowBaseAnnotation = assertFlowBaseAnnotation;
exports.assertFlowDeclaration = assertFlowDeclaration;
exports.assertFlowPredicate = assertFlowPredicate;
exports.assertFlowType = assertFlowType;
exports.assertFor = assertFor;
exports.assertForInStatement = assertForInStatement;
exports.assertForOfStatement = assertForOfStatement;
exports.assertForStatement = assertForStatement;
exports.assertForXStatement = assertForXStatement;
exports.assertFunction = assertFunction;
exports.assertFunctionDeclaration = assertFunctionDeclaration;
exports.assertFunctionExpression = assertFunctionExpression;
exports.assertFunctionParent = assertFunctionParent;
exports.assertFunctionTypeAnnotation = assertFunctionTypeAnnotation;
exports.assertFunctionTypeParam = assertFunctionTypeParam;
exports.assertGenericTypeAnnotation = assertGenericTypeAnnotation;
exports.assertIdentifier = assertIdentifier;
exports.assertIfStatement = assertIfStatement;
exports.assertImmutable = assertImmutable;
exports.assertImport = assertImport;
exports.assertImportAttribute = assertImportAttribute;
exports.assertImportDeclaration = assertImportDeclaration;
exports.assertImportDefaultSpecifier = assertImportDefaultSpecifier;
exports.assertImportExpression = assertImportExpression;
exports.assertImportNamespaceSpecifier = assertImportNamespaceSpecifier;
exports.assertImportOrExportDeclaration = assertImportOrExportDeclaration;
exports.assertImportSpecifier = assertImportSpecifier;
exports.assertIndexedAccessType = assertIndexedAccessType;
exports.assertInferredPredicate = assertInferredPredicate;
exports.assertInterfaceDeclaration = assertInterfaceDeclaration;
exports.assertInterfaceExtends = assertInterfaceExtends;
exports.assertInterfaceTypeAnnotation = assertInterfaceTypeAnnotation;
exports.assertInterpreterDirective = assertInterpreterDirective;
exports.assertIntersectionTypeAnnotation = assertIntersectionTypeAnnotation;
exports.assertJSX = assertJSX;
exports.assertJSXAttribute = assertJSXAttribute;
exports.assertJSXClosingElement = assertJSXClosingElement;
exports.assertJSXClosingFragment = assertJSXClosingFragment;
exports.assertJSXElement = assertJSXElement;
exports.assertJSXEmptyExpression = assertJSXEmptyExpression;
exports.assertJSXExpressionContainer = assertJSXExpressionContainer;
exports.assertJSXFragment = assertJSXFragment;
exports.assertJSXIdentifier = assertJSXIdentifier;
exports.assertJSXMemberExpression = assertJSXMemberExpression;
exports.assertJSXNamespacedName = assertJSXNamespacedName;
exports.assertJSXOpeningElement = assertJSXOpeningElement;
exports.assertJSXOpeningFragment = assertJSXOpeningFragment;
exports.assertJSXSpreadAttribute = assertJSXSpreadAttribute;
exports.assertJSXSpreadChild = assertJSXSpreadChild;
exports.assertJSXText = assertJSXText;
exports.assertLVal = assertLVal;
exports.assertLabeledStatement = assertLabeledStatement;
exports.assertLiteral = assertLiteral;
exports.assertLogicalExpression = assertLogicalExpression;
exports.assertLoop = assertLoop;
exports.assertMemberExpression = assertMemberExpression;
exports.assertMetaProperty = assertMetaProperty;
exports.assertMethod = assertMethod;
exports.assertMiscellaneous = assertMiscellaneous;
exports.assertMixedTypeAnnotation = assertMixedTypeAnnotation;
exports.assertModuleDeclaration = assertModuleDeclaration;
exports.assertModuleExpression = assertModuleExpression;
exports.assertModuleSpecifier = assertModuleSpecifier;
exports.assertNewExpression = assertNewExpression;
exports.assertNoop = assertNoop;
exports.assertNullLiteral = assertNullLiteral;
exports.assertNullLiteralTypeAnnotation = assertNullLiteralTypeAnnotation;
exports.assertNullableTypeAnnotation = assertNullableTypeAnnotation;
exports.assertNumberLiteral = assertNumberLiteral;
exports.assertNumberLiteralTypeAnnotation = assertNumberLiteralTypeAnnotation;
exports.assertNumberTypeAnnotation = assertNumberTypeAnnotation;
exports.assertNumericLiteral = assertNumericLiteral;
exports.assertObjectExpression = assertObjectExpression;
exports.assertObjectMember = assertObjectMember;
exports.assertObjectMethod = assertObjectMethod;
exports.assertObjectPattern = assertObjectPattern;
exports.assertObjectProperty = assertObjectProperty;
exports.assertObjectTypeAnnotation = assertObjectTypeAnnotation;
exports.assertObjectTypeCallProperty = assertObjectTypeCallProperty;
exports.assertObjectTypeIndexer = assertObjectTypeIndexer;
exports.assertObjectTypeInternalSlot = assertObjectTypeInternalSlot;
exports.assertObjectTypeProperty = assertObjectTypeProperty;
exports.assertObjectTypeSpreadProperty = assertObjectTypeSpreadProperty;
exports.assertOpaqueType = assertOpaqueType;
exports.assertOptionalCallExpression = assertOptionalCallExpression;
exports.assertOptionalIndexedAccessType = assertOptionalIndexedAccessType;
exports.assertOptionalMemberExpression = assertOptionalMemberExpression;
exports.assertParenthesizedExpression = assertParenthesizedExpression;
exports.assertPattern = assertPattern;
exports.assertPatternLike = assertPatternLike;
exports.assertPipelineBareFunction = assertPipelineBareFunction;
exports.assertPipelinePrimaryTopicReference = assertPipelinePrimaryTopicReference;
exports.assertPipelineTopicExpression = assertPipelineTopicExpression;
exports.assertPlaceholder = assertPlaceholder;
exports.assertPrivate = assertPrivate;
exports.assertPrivateName = assertPrivateName;
exports.assertProgram = assertProgram;
exports.assertProperty = assertProperty;
exports.assertPureish = assertPureish;
exports.assertQualifiedTypeIdentifier = assertQualifiedTypeIdentifier;
exports.assertRecordExpression = assertRecordExpression;
exports.assertRegExpLiteral = assertRegExpLiteral;
exports.assertRegexLiteral = assertRegexLiteral;
exports.assertRestElement = assertRestElement;
exports.assertRestProperty = assertRestProperty;
exports.assertReturnStatement = assertReturnStatement;
exports.assertScopable = assertScopable;
exports.assertSequenceExpression = assertSequenceExpression;
exports.assertSpreadElement = assertSpreadElement;
exports.assertSpreadProperty = assertSpreadProperty;
exports.assertStandardized = assertStandardized;
exports.assertStatement = assertStatement;
exports.assertStaticBlock = assertStaticBlock;
exports.assertStringLiteral = assertStringLiteral;
exports.assertStringLiteralTypeAnnotation = assertStringLiteralTypeAnnotation;
exports.assertStringTypeAnnotation = assertStringTypeAnnotation;
exports.assertSuper = assertSuper;
exports.assertSwitchCase = assertSwitchCase;
exports.assertSwitchStatement = assertSwitchStatement;
exports.assertSymbolTypeAnnotation = assertSymbolTypeAnnotation;
exports.assertTSAnyKeyword = assertTSAnyKeyword;
exports.assertTSArrayType = assertTSArrayType;
exports.assertTSAsExpression = assertTSAsExpression;
exports.assertTSBaseType = assertTSBaseType;
exports.assertTSBigIntKeyword = assertTSBigIntKeyword;
exports.assertTSBooleanKeyword = assertTSBooleanKeyword;
exports.assertTSCallSignatureDeclaration = assertTSCallSignatureDeclaration;
exports.assertTSConditionalType = assertTSConditionalType;
exports.assertTSConstructSignatureDeclaration = assertTSConstructSignatureDeclaration;
exports.assertTSConstructorType = assertTSConstructorType;
exports.assertTSDeclareFunction = assertTSDeclareFunction;
exports.assertTSDeclareMethod = assertTSDeclareMethod;
exports.assertTSEntityName = assertTSEntityName;
exports.assertTSEnumDeclaration = assertTSEnumDeclaration;
exports.assertTSEnumMember = assertTSEnumMember;
exports.assertTSExportAssignment = assertTSExportAssignment;
exports.assertTSExpressionWithTypeArguments = assertTSExpressionWithTypeArguments;
exports.assertTSExternalModuleReference = assertTSExternalModuleReference;
exports.assertTSFunctionType = assertTSFunctionType;
exports.assertTSImportEqualsDeclaration = assertTSImportEqualsDeclaration;
exports.assertTSImportType = assertTSImportType;
exports.assertTSIndexSignature = assertTSIndexSignature;
exports.assertTSIndexedAccessType = assertTSIndexedAccessType;
exports.assertTSInferType = assertTSInferType;
exports.assertTSInstantiationExpression = assertTSInstantiationExpression;
exports.assertTSInterfaceBody = assertTSInterfaceBody;
exports.assertTSInterfaceDeclaration = assertTSInterfaceDeclaration;
exports.assertTSIntersectionType = assertTSIntersectionType;
exports.assertTSIntrinsicKeyword = assertTSIntrinsicKeyword;
exports.assertTSLiteralType = assertTSLiteralType;
exports.assertTSMappedType = assertTSMappedType;
exports.assertTSMethodSignature = assertTSMethodSignature;
exports.assertTSModuleBlock = assertTSModuleBlock;
exports.assertTSModuleDeclaration = assertTSModuleDeclaration;
exports.assertTSNamedTupleMember = assertTSNamedTupleMember;
exports.assertTSNamespaceExportDeclaration = assertTSNamespaceExportDeclaration;
exports.assertTSNeverKeyword = assertTSNeverKeyword;
exports.assertTSNonNullExpression = assertTSNonNullExpression;
exports.assertTSNullKeyword = assertTSNullKeyword;
exports.assertTSNumberKeyword = assertTSNumberKeyword;
exports.assertTSObjectKeyword = assertTSObjectKeyword;
exports.assertTSOptionalType = assertTSOptionalType;
exports.assertTSParameterProperty = assertTSParameterProperty;
exports.assertTSParenthesizedType = assertTSParenthesizedType;
exports.assertTSPropertySignature = assertTSPropertySignature;
exports.assertTSQualifiedName = assertTSQualifiedName;
exports.assertTSRestType = assertTSRestType;
exports.assertTSSatisfiesExpression = assertTSSatisfiesExpression;
exports.assertTSStringKeyword = assertTSStringKeyword;
exports.assertTSSymbolKeyword = assertTSSymbolKeyword;
exports.assertTSThisType = assertTSThisType;
exports.assertTSTupleType = assertTSTupleType;
exports.assertTSType = assertTSType;
exports.assertTSTypeAliasDeclaration = assertTSTypeAliasDeclaration;
exports.assertTSTypeAnnotation = assertTSTypeAnnotation;
exports.assertTSTypeAssertion = assertTSTypeAssertion;
exports.assertTSTypeElement = assertTSTypeElement;
exports.assertTSTypeLiteral = assertTSTypeLiteral;
exports.assertTSTypeOperator = assertTSTypeOperator;
exports.assertTSTypeParameter = assertTSTypeParameter;
exports.assertTSTypeParameterDeclaration = assertTSTypeParameterDeclaration;
exports.assertTSTypeParameterInstantiation = assertTSTypeParameterInstantiation;
exports.assertTSTypePredicate = assertTSTypePredicate;
exports.assertTSTypeQuery = assertTSTypeQuery;
exports.assertTSTypeReference = assertTSTypeReference;
exports.assertTSUndefinedKeyword = assertTSUndefinedKeyword;
exports.assertTSUnionType = assertTSUnionType;
exports.assertTSUnknownKeyword = assertTSUnknownKeyword;
exports.assertTSVoidKeyword = assertTSVoidKeyword;
exports.assertTaggedTemplateExpression = assertTaggedTemplateExpression;
exports.assertTemplateElement = assertTemplateElement;
exports.assertTemplateLiteral = assertTemplateLiteral;
exports.assertTerminatorless = assertTerminatorless;
exports.assertThisExpression = assertThisExpression;
exports.assertThisTypeAnnotation = assertThisTypeAnnotation;
exports.assertThrowStatement = assertThrowStatement;
exports.assertTopicReference = assertTopicReference;
exports.assertTryStatement = assertTryStatement;
exports.assertTupleExpression = assertTupleExpression;
exports.assertTupleTypeAnnotation = assertTupleTypeAnnotation;
exports.assertTypeAlias = assertTypeAlias;
exports.assertTypeAnnotation = assertTypeAnnotation;
exports.assertTypeCastExpression = assertTypeCastExpression;
exports.assertTypeParameter = assertTypeParameter;
exports.assertTypeParameterDeclaration = assertTypeParameterDeclaration;
exports.assertTypeParameterInstantiation = assertTypeParameterInstantiation;
exports.assertTypeScript = assertTypeScript;
exports.assertTypeofTypeAnnotation = assertTypeofTypeAnnotation;
exports.assertUnaryExpression = assertUnaryExpression;
exports.assertUnaryLike = assertUnaryLike;
exports.assertUnionTypeAnnotation = assertUnionTypeAnnotation;
exports.assertUpdateExpression = assertUpdateExpression;
exports.assertUserWhitespacable = assertUserWhitespacable;
exports.assertV8IntrinsicIdentifier = assertV8IntrinsicIdentifier;
exports.assertVariableDeclaration = assertVariableDeclaration;
exports.assertVariableDeclarator = assertVariableDeclarator;
exports.assertVariance = assertVariance;
exports.assertVoidTypeAnnotation = assertVoidTypeAnnotation;
exports.assertWhile = assertWhile;
exports.assertWhileStatement = assertWhileStatement;
exports.assertWithStatement = assertWithStatement;
exports.assertYieldExpression = assertYieldExpression;
var _is = require("../../validators/is.js");
var _deprecationWarning = require("../../utils/deprecationWarning.js");
function assert(type, node, opts) {
  if (!(0, _is.default)(type, node, opts)) {
    throw new Error(`Expected type "${type}" with option ${JSON.stringify(opts)}, ` + `but instead got "${node.type}".`);
  }
}
function assertArrayExpression(node, opts) {
  assert("ArrayExpression", node, opts);
}
function assertAssignmentExpression(node, opts) {
  assert("AssignmentExpression", node, opts);
}
function assertBinaryExpression(node, opts) {
  assert("BinaryExpression", node, opts);
}
function assertInterpreterDirective(node, opts) {
  assert("InterpreterDirective", node, opts);
}
function assertDirective(node, opts) {
  assert("Directive", node, opts);
}
function assertDirectiveLiteral(node, opts) {
  assert("DirectiveLiteral", node, opts);
}
function assertBlockStatement(node, opts) {
  assert("BlockStatement", node, opts);
}
function assertBreakStatement(node, opts) {
  assert("BreakStatement", node, opts);
}
function assertCallExpression(node, opts) {
  assert("CallExpression", node, opts);
}
function assertCatchClause(node, opts) {
  assert("CatchClause", node, opts);
}
function assertConditionalExpression(node, opts) {
  assert("ConditionalExpression", node, opts);
}
function assertContinueStatement(node, opts) {
  assert("ContinueStatement", node, opts);
}
function assertDebuggerStatement(node, opts) {
  assert("DebuggerStatement", node, opts);
}
function assertDoWhileStatement(node, opts) {
  assert("DoWhileStatement", node, opts);
}
function assertEmptyStatement(node, opts) {
  assert("EmptyStatement", node, opts);
}
function assertExpressionStatement(node, opts) {
  assert("ExpressionStatement", node, opts);
}
function assertFile(node, opts) {
  assert("File", node, opts);
}
function assertForInStatement(node, opts) {
  assert("ForInStatement", node, opts);
}
function assertForStatement(node, opts) {
  assert("ForStatement", node, opts);
}
function assertFunctionDeclaration(node, opts) {
  assert("FunctionDeclaration", node, opts);
}
function assertFunctionExpression(node, opts) {
  assert("FunctionExpression", node, opts);
}
function assertIdentifier(node, opts) {
  assert("Identifier", node, opts);
}
function assertIfStatement(node, opts) {
  assert("IfStatement", node, opts);
}
function assertLabeledStatement(node, opts) {
  assert("LabeledStatement", node, opts);
}
function assertStringLiteral(node, opts) {
  assert("StringLiteral", node, opts);
}
function assertNumericLiteral(node, opts) {
  assert("NumericLiteral", node, opts);
}
function assertNullLiteral(node, opts) {
  assert("NullLiteral", node, opts);
}
function assertBooleanLiteral(node, opts) {
  assert("BooleanLiteral", node, opts);
}
function assertRegExpLiteral(node, opts) {
  assert("RegExpLiteral", node, opts);
}
function assertLogicalExpression(node, opts) {
  assert("LogicalExpression", node, opts);
}
function assertMemberExpression(node, opts) {
  assert("MemberExpression", node, opts);
}
function assertNewExpression(node, opts) {
  assert("NewExpression", node, opts);
}
function assertProgram(node, opts) {
  assert("Program", node, opts);
}
function assertObjectExpression(node, opts) {
  assert("ObjectExpression", node, opts);
}
function assertObjectMethod(node, opts) {
  assert("ObjectMethod", node, opts);
}
function assertObjectProperty(node, opts) {
  assert("ObjectProperty", node, opts);
}
function assertRestElement(node, opts) {
  assert("RestElement", node, opts);
}
function assertReturnStatement(node, opts) {
  assert("ReturnStatement", node, opts);
}
function assertSequenceExpression(node, opts) {
  assert("SequenceExpression", node, opts);
}
function assertParenthesizedExpression(node, opts) {
  assert("ParenthesizedExpression", node, opts);
}
function assertSwitchCase(node, opts) {
  assert("SwitchCase", node, opts);
}
function assertSwitchStatement(node, opts) {
  assert("SwitchStatement", node, opts);
}
function assertThisExpression(node, opts) {
  assert("ThisExpression", node, opts);
}
function assertThrowStatement(node, opts) {
  assert("ThrowStatement", node, opts);
}
function assertTryStatement(node, opts) {
  assert("TryStatement", node, opts);
}
function assertUnaryExpression(node, opts) {
  assert("UnaryExpression", node, opts);
}
function assertUpdateExpression(node, opts) {
  assert("UpdateExpression", node, opts);
}
function assertVariableDeclaration(node, opts) {
  assert("VariableDeclaration", node, opts);
}
function assertVariableDeclarator(node, opts) {
  assert("VariableDeclarator", node, opts);
}
function assertWhileStatement(node, opts) {
  assert("WhileStatement", node, opts);
}
function assertWithStatement(node, opts) {
  assert("WithStatement", node, opts);
}
function assertAssignmentPattern(node, opts) {
  assert("AssignmentPattern", node, opts);
}
function assertArrayPattern(node, opts) {
  assert("ArrayPattern", node, opts);
}
function assertArrowFunctionExpression(node, opts) {
  assert("ArrowFunctionExpression", node, opts);
}
function assertClassBody(node, opts) {
  assert("ClassBody", node, opts);
}
function assertClassExpression(node, opts) {
  assert("ClassExpression", node, opts);
}
function assertClassDeclaration(node, opts) {
  assert("ClassDeclaration", node, opts);
}
function assertExportAllDeclaration(node, opts) {
  assert("ExportAllDeclaration", node, opts);
}
function assertExportDefaultDeclaration(node, opts) {
  assert("ExportDefaultDeclaration", node, opts);
}
function assertExportNamedDeclaration(node, opts) {
  assert("ExportNamedDeclaration", node, opts);
}
function assertExportSpecifier(node, opts) {
  assert("ExportSpecifier", node, opts);
}
function assertForOfStatement(node, opts) {
  assert("ForOfStatement", node, opts);
}
function assertImportDeclaration(node, opts) {
  assert("ImportDeclaration", node, opts);
}
function assertImportDefaultSpecifier(node, opts) {
  assert("ImportDefaultSpecifier", node, opts);
}
function assertImportNamespaceSpecifier(node, opts) {
  assert("ImportNamespaceSpecifier", node, opts);
}
function assertImportSpecifier(node, opts) {
  assert("ImportSpecifier", node, opts);
}
function assertImportExpression(node, opts) {
  assert("ImportExpression", node, opts);
}
function assertMetaProperty(node, opts) {
  assert("MetaProperty", node, opts);
}
function assertClassMethod(node, opts) {
  assert("ClassMethod", node, opts);
}
function assertObjectPattern(node, opts) {
  assert("ObjectPattern", node, opts);
}
function assertSpreadElement(node, opts) {
  assert("SpreadElement", node, opts);
}
function assertSuper(node, opts) {
  assert("Super", node, opts);
}
function assertTaggedTemplateExpression(node, opts) {
  assert("TaggedTemplateExpression", node, opts);
}
function assertTemplateElement(node, opts) {
  assert("TemplateElement", node, opts);
}
function assertTemplateLiteral(node, opts) {
  assert("TemplateLiteral", node, opts);
}
function assertYieldExpression(node, opts) {
  assert("YieldExpression", node, opts);
}
function assertAwaitExpression(node, opts) {
  assert("AwaitExpression", node, opts);
}
function assertImport(node, opts) {
  assert("Import", node, opts);
}
function assertBigIntLiteral(node, opts) {
  assert("BigIntLiteral", node, opts);
}
function assertExportNamespaceSpecifier(node, opts) {
  assert("ExportNamespaceSpecifier", node, opts);
}
function assertOptionalMemberExpression(node, opts) {
  assert("OptionalMemberExpression", node, opts);
}
function assertOptionalCallExpression(node, opts) {
  assert("OptionalCallExpression", node, opts);
}
function assertClassProperty(node, opts) {
  assert("ClassProperty", node, opts);
}
function assertClassAccessorProperty(node, opts) {
  assert("ClassAccessorProperty", node, opts);
}
function assertClassPrivateProperty(node, opts) {
  assert("ClassPrivateProperty", node, opts);
}
function assertClassPrivateMethod(node, opts) {
  assert("ClassPrivateMethod", node, opts);
}
function assertPrivateName(node, opts) {
  assert("PrivateName", node, opts);
}
function assertStaticBlock(node, opts) {
  assert("StaticBlock", node, opts);
}
function assertAnyTypeAnnotation(node, opts) {
  assert("AnyTypeAnnotation", node, opts);
}
function assertArrayTypeAnnotation(node, opts) {
  assert("ArrayTypeAnnotation", node, opts);
}
function assertBooleanTypeAnnotation(node, opts) {
  assert("BooleanTypeAnnotation", node, opts);
}
function assertBooleanLiteralTypeAnnotation(node, opts) {
  assert("BooleanLiteralTypeAnnotation", node, opts);
}
function assertNullLiteralTypeAnnotation(node, opts) {
  assert("NullLiteralTypeAnnotation", node, opts);
}
function assertClassImplements(node, opts) {
  assert("ClassImplements", node, opts);
}
function assertDeclareClass(node, opts) {
  assert("DeclareClass", node, opts);
}
function assertDeclareFunction(node, opts) {
  assert("DeclareFunction", node, opts);
}
function assertDeclareInterface(node, opts) {
  assert("DeclareInterface", node, opts);
}
function assertDeclareModule(node, opts) {
  assert("DeclareModule", node, opts);
}
function assertDeclareModuleExports(node, opts) {
  assert("DeclareModuleExports", node, opts);
}
function assertDeclareTypeAlias(node, opts) {
  assert("DeclareTypeAlias", node, opts);
}
function assertDeclareOpaqueType(node, opts) {
  assert("DeclareOpaqueType", node, opts);
}
function assertDeclareVariable(node, opts) {
  assert("DeclareVariable", node, opts);
}
function assertDeclareExportDeclaration(node, opts) {
  assert("DeclareExportDeclaration", node, opts);
}
function assertDeclareExportAllDeclaration(node, opts) {
  assert("DeclareExportAllDeclaration", node, opts);
}
function assertDeclaredPredicate(node, opts) {
  assert("DeclaredPredicate", node, opts);
}
function assertExistsTypeAnnotation(node, opts) {
  assert("ExistsTypeAnnotation", node, opts);
}
function assertFunctionTypeAnnotation(node, opts) {
  assert("FunctionTypeAnnotation", node, opts);
}
function assertFunctionTypeParam(node, opts) {
  assert("FunctionTypeParam", node, opts);
}
function assertGenericTypeAnnotation(node, opts) {
  assert("GenericTypeAnnotation", node, opts);
}
function assertInferredPredicate(node, opts) {
  assert("InferredPredicate", node, opts);
}
function assertInterfaceExtends(node, opts) {
  assert("InterfaceExtends", node, opts);
}
function assertInterfaceDeclaration(node, opts) {
  assert("InterfaceDeclaration", node, opts);
}
function assertInterfaceTypeAnnotation(node, opts) {
  assert("InterfaceTypeAnnotation", node, opts);
}
function assertIntersectionTypeAnnotation(node, opts) {
  assert("IntersectionTypeAnnotation", node, opts);
}
function assertMixedTypeAnnotation(node, opts) {
  assert("MixedTypeAnnotation", node, opts);
}
function assertEmptyTypeAnnotation(node, opts) {
  assert("EmptyTypeAnnotation", node, opts);
}
function assertNullableTypeAnnotation(node, opts) {
  assert("NullableTypeAnnotation", node, opts);
}
function assertNumberLiteralTypeAnnotation(node, opts) {
  assert("NumberLiteralTypeAnnotation", node, opts);
}
function assertNumberTypeAnnotation(node, opts) {
  assert("NumberTypeAnnotation", node, opts);
}
function assertObjectTypeAnnotation(node, opts) {
  assert("ObjectTypeAnnotation", node, opts);
}
function assertObjectTypeInternalSlot(node, opts) {
  assert("ObjectTypeInternalSlot", node, opts);
}
function assertObjectTypeCallProperty(node, opts) {
  assert("ObjectTypeCallProperty", node, opts);
}
function assertObjectTypeIndexer(node, opts) {
  assert("ObjectTypeIndexer", node, opts);
}
function assertObjectTypeProperty(node, opts) {
  assert("ObjectTypeProperty", node, opts);
}
function assertObjectTypeSpreadProperty(node, opts) {
  assert("ObjectTypeSpreadProperty", node, opts);
}
function assertOpaqueType(node, opts) {
  assert("OpaqueType", node, opts);
}
function assertQualifiedTypeIdentifier(node, opts) {
  assert("QualifiedTypeIdentifier", node, opts);
}
function assertStringLiteralTypeAnnotation(node, opts) {
  assert("StringLiteralTypeAnnotation", node, opts);
}
function assertStringTypeAnnotation(node, opts) {
  assert("StringTypeAnnotation", node, opts);
}
function assertSymbolTypeAnnotation(node, opts) {
  assert("SymbolTypeAnnotation", node, opts);
}
function assertThisTypeAnnotation(node, opts) {
  assert("ThisTypeAnnotation", node, opts);
}
function assertTupleTypeAnnotation(node, opts) {
  assert("TupleTypeAnnotation", node, opts);
}
function assertTypeofTypeAnnotation(node, opts) {
  assert("TypeofTypeAnnotation", node, opts);
}
function assertTypeAlias(node, opts) {
  assert("TypeAlias", node, opts);
}
function assertTypeAnnotation(node, opts) {
  assert("TypeAnnotation", node, opts);
}
function assertTypeCastExpression(node, opts) {
  assert("TypeCastExpression", node, opts);
}
function assertTypeParameter(node, opts) {
  assert("TypeParameter", node, opts);
}
function assertTypeParameterDeclaration(node, opts) {
  assert("TypeParameterDeclaration", node, opts);
}
function assertTypeParameterInstantiation(node, opts) {
  assert("TypeParameterInstantiation", node, opts);
}
function assertUnionTypeAnnotation(node, opts) {
  assert("UnionTypeAnnotation", node, opts);
}
function assertVariance(node, opts) {
  assert("Variance", node, opts);
}
function assertVoidTypeAnnotation(node, opts) {
  assert("VoidTypeAnnotation", node, opts);
}
function assertEnumDeclaration(node, opts) {
  assert("EnumDeclaration", node, opts);
}
function assertEnumBooleanBody(node, opts) {
  assert("EnumBooleanBody", node, opts);
}
function assertEnumNumberBody(node, opts) {
  assert("EnumNumberBody", node, opts);
}
function assertEnumStringBody(node, opts) {
  assert("EnumStringBody", node, opts);
}
function assertEnumSymbolBody(node, opts) {
  assert("EnumSymbolBody", node, opts);
}
function assertEnumBooleanMember(node, opts) {
  assert("EnumBooleanMember", node, opts);
}
function assertEnumNumberMember(node, opts) {
  assert("EnumNumberMember", node, opts);
}
function assertEnumStringMember(node, opts) {
  assert("EnumStringMember", node, opts);
}
function assertEnumDefaultedMember(node, opts) {
  assert("EnumDefaultedMember", node, opts);
}
function assertIndexedAccessType(node, opts) {
  assert("IndexedAccessType", node, opts);
}
function assertOptionalIndexedAccessType(node, opts) {
  assert("OptionalIndexedAccessType", node, opts);
}
function assertJSXAttribute(node, opts) {
  assert("JSXAttribute", node, opts);
}
function assertJSXClosingElement(node, opts) {
  assert("JSXClosingElement", node, opts);
}
function assertJSXElement(node, opts) {
  assert("JSXElement", node, opts);
}
function assertJSXEmptyExpression(node, opts) {
  assert("JSXEmptyExpression", node, opts);
}
function assertJSXExpressionContainer(node, opts) {
  assert("JSXExpressionContainer", node, opts);
}
function assertJSXSpreadChild(node, opts) {
  assert("JSXSpreadChild", node, opts);
}
function assertJSXIdentifier(node, opts) {
  assert("JSXIdentifier", node, opts);
}
function assertJSXMemberExpression(node, opts) {
  assert("JSXMemberExpression", node, opts);
}
function assertJSXNamespacedName(node, opts) {
  assert("JSXNamespacedName", node, opts);
}
function assertJSXOpeningElement(node, opts) {
  assert("JSXOpeningElement", node, opts);
}
function assertJSXSpreadAttribute(node, opts) {
  assert("JSXSpreadAttribute", node, opts);
}
function assertJSXText(node, opts) {
  assert("JSXText", node, opts);
}
function assertJSXFragment(node, opts) {
  assert("JSXFragment", node, opts);
}
function assertJSXOpeningFragment(node, opts) {
  assert("JSXOpeningFragment", node, opts);
}
function assertJSXClosingFragment(node, opts) {
  assert("JSXClosingFragment", node, opts);
}
function assertNoop(node, opts) {
  assert("Noop", node, opts);
}
function assertPlaceholder(node, opts) {
  assert("Placeholder", node, opts);
}
function assertV8IntrinsicIdentifier(node, opts) {
  assert("V8IntrinsicIdentifier", node, opts);
}
function assertArgumentPlaceholder(node, opts) {
  assert("ArgumentPlaceholder", node, opts);
}
function assertBindExpression(node, opts) {
  assert("BindExpression", node, opts);
}
function assertImportAttribute(node, opts) {
  assert("ImportAttribute", node, opts);
}
function assertDecorator(node, opts) {
  assert("Decorator", node, opts);
}
function assertDoExpression(node, opts) {
  assert("DoExpression", node, opts);
}
function assertExportDefaultSpecifier(node, opts) {
  assert("ExportDefaultSpecifier", node, opts);
}
function assertRecordExpression(node, opts) {
  assert("RecordExpression", node, opts);
}
function assertTupleExpression(node, opts) {
  assert("TupleExpression", node, opts);
}
function assertDecimalLiteral(node, opts) {
  assert("DecimalLiteral", node, opts);
}
function assertModuleExpression(node, opts) {
  assert("ModuleExpression", node, opts);
}
function assertTopicReference(node, opts) {
  assert("TopicReference", node, opts);
}
function assertPipelineTopicExpression(node, opts) {
  assert("PipelineTopicExpression", node, opts);
}
function assertPipelineBareFunction(node, opts) {
  assert("PipelineBareFunction", node, opts);
}
function assertPipelinePrimaryTopicReference(node, opts) {
  assert("PipelinePrimaryTopicReference", node, opts);
}
function assertTSParameterProperty(node, opts) {
  assert("TSParameterProperty", node, opts);
}
function assertTSDeclareFunction(node, opts) {
  assert("TSDeclareFunction", node, opts);
}
function assertTSDeclareMethod(node, opts) {
  assert("TSDeclareMethod", node, opts);
}
function assertTSQualifiedName(node, opts) {
  assert("TSQualifiedName", node, opts);
}
function assertTSCallSignatureDeclaration(node, opts) {
  assert("TSCallSignatureDeclaration", node, opts);
}
function assertTSConstructSignatureDeclaration(node, opts) {
  assert("TSConstructSignatureDeclaration", node, opts);
}
function assertTSPropertySignature(node, opts) {
  assert("TSPropertySignature", node, opts);
}
function assertTSMethodSignature(node, opts) {
  assert("TSMethodSignature", node, opts);
}
function assertTSIndexSignature(node, opts) {
  assert("TSIndexSignature", node, opts);
}
function assertTSAnyKeyword(node, opts) {
  assert("TSAnyKeyword", node, opts);
}
function assertTSBooleanKeyword(node, opts) {
  assert("TSBooleanKeyword", node, opts);
}
function assertTSBigIntKeyword(node, opts) {
  assert("TSBigIntKeyword", node, opts);
}
function assertTSIntrinsicKeyword(node, opts) {
  assert("TSIntrinsicKeyword", node, opts);
}
function assertTSNeverKeyword(node, opts) {
  assert("TSNeverKeyword", node, opts);
}
function assertTSNullKeyword(node, opts) {
  assert("TSNullKeyword", node, opts);
}
function assertTSNumberKeyword(node, opts) {
  assert("TSNumberKeyword", node, opts);
}
function assertTSObjectKeyword(node, opts) {
  assert("TSObjectKeyword", node, opts);
}
function assertTSStringKeyword(node, opts) {
  assert("TSStringKeyword", node, opts);
}
function assertTSSymbolKeyword(node, opts) {
  assert("TSSymbolKeyword", node, opts);
}
function assertTSUndefinedKeyword(node, opts) {
  assert("TSUndefinedKeyword", node, opts);
}
function assertTSUnknownKeyword(node, opts) {
  assert("TSUnknownKeyword", node, opts);
}
function assertTSVoidKeyword(node, opts) {
  assert("TSVoidKeyword", node, opts);
}
function assertTSThisType(node, opts) {
  assert("TSThisType", node, opts);
}
function assertTSFunctionType(node, opts) {
  assert("TSFunctionType", node, opts);
}
function assertTSConstructorType(node, opts) {
  assert("TSConstructorType", node, opts);
}
function assertTSTypeReference(node, opts) {
  assert("TSTypeReference", node, opts);
}
function assertTSTypePredicate(node, opts) {
  assert("TSTypePredicate", node, opts);
}
function assertTSTypeQuery(node, opts) {
  assert("TSTypeQuery", node, opts);
}
function assertTSTypeLiteral(node, opts) {
  assert("TSTypeLiteral", node, opts);
}
function assertTSArrayType(node, opts) {
  assert("TSArrayType", node, opts);
}
function assertTSTupleType(node, opts) {
  assert("TSTupleType", node, opts);
}
function assertTSOptionalType(node, opts) {
  assert("TSOptionalType", node, opts);
}
function assertTSRestType(node, opts) {
  assert("TSRestType", node, opts);
}
function assertTSNamedTupleMember(node, opts) {
  assert("TSNamedTupleMember", node, opts);
}
function assertTSUnionType(node, opts) {
  assert("TSUnionType", node, opts);
}
function assertTSIntersectionType(node, opts) {
  assert("TSIntersectionType", node, opts);
}
function assertTSConditionalType(node, opts) {
  assert("TSConditionalType", node, opts);
}
function assertTSInferType(node, opts) {
  assert("TSInferType", node, opts);
}
function assertTSParenthesizedType(node, opts) {
  assert("TSParenthesizedType", node, opts);
}
function assertTSTypeOperator(node, opts) {
  assert("TSTypeOperator", node, opts);
}
function assertTSIndexedAccessType(node, opts) {
  assert("TSIndexedAccessType", node, opts);
}
function assertTSMappedType(node, opts) {
  assert("TSMappedType", node, opts);
}
function assertTSLiteralType(node, opts) {
  assert("TSLiteralType", node, opts);
}
function assertTSExpressionWithTypeArguments(node, opts) {
  assert("TSExpressionWithTypeArguments", node, opts);
}
function assertTSInterfaceDeclaration(node, opts) {
  assert("TSInterfaceDeclaration", node, opts);
}
function assertTSInterfaceBody(node, opts) {
  assert("TSInterfaceBody", node, opts);
}
function assertTSTypeAliasDeclaration(node, opts) {
  assert("TSTypeAliasDeclaration", node, opts);
}
function assertTSInstantiationExpression(node, opts) {
  assert("TSInstantiationExpression", node, opts);
}
function assertTSAsExpression(node, opts) {
  assert("TSAsExpression", node, opts);
}
function assertTSSatisfiesExpression(node, opts) {
  assert("TSSatisfiesExpression", node, opts);
}
function assertTSTypeAssertion(node, opts) {
  assert("TSTypeAssertion", node, opts);
}
function assertTSEnumDeclaration(node, opts) {
  assert("TSEnumDeclaration", node, opts);
}
function assertTSEnumMember(node, opts) {
  assert("TSEnumMember", node, opts);
}
function assertTSModuleDeclaration(node, opts) {
  assert("TSModuleDeclaration", node, opts);
}
function assertTSModuleBlock(node, opts) {
  assert("TSModuleBlock", node, opts);
}
function assertTSImportType(node, opts) {
  assert("TSImportType", node, opts);
}
function assertTSImportEqualsDeclaration(node, opts) {
  assert("TSImportEqualsDeclaration", node, opts);
}
function assertTSExternalModuleReference(node, opts) {
  assert("TSExternalModuleReference", node, opts);
}
function assertTSNonNullExpression(node, opts) {
  assert("TSNonNullExpression", node, opts);
}
function assertTSExportAssignment(node, opts) {
  assert("TSExportAssignment", node, opts);
}
function assertTSNamespaceExportDeclaration(node, opts) {
  assert("TSNamespaceExportDeclaration", node, opts);
}
function assertTSTypeAnnotation(node, opts) {
  assert("TSTypeAnnotation", node, opts);
}
function assertTSTypeParameterInstantiation(node, opts) {
  assert("TSTypeParameterInstantiation", node, opts);
}
function assertTSTypeParameterDeclaration(node, opts) {
  assert("TSTypeParameterDeclaration", node, opts);
}
function assertTSTypeParameter(node, opts) {
  assert("TSTypeParameter", node, opts);
}
function assertStandardized(node, opts) {
  assert("Standardized", node, opts);
}
function assertExpression(node, opts) {
  assert("Expression", node, opts);
}
function assertBinary(node, opts) {
  assert("Binary", node, opts);
}
function assertScopable(node, opts) {
  assert("Scopable", node, opts);
}
function assertBlockParent(node, opts) {
  assert("BlockParent", node, opts);
}
function assertBlock(node, opts) {
  assert("Block", node, opts);
}
function assertStatement(node, opts) {
  assert("Statement", node, opts);
}
function assertTerminatorless(node, opts) {
  assert("Terminatorless", node, opts);
}
function assertCompletionStatement(node, opts) {
  assert("CompletionStatement", node, opts);
}
function assertConditional(node, opts) {
  assert("Conditional", node, opts);
}
function assertLoop(node, opts) {
  assert("Loop", node, opts);
}
function assertWhile(node, opts) {
  assert("While", node, opts);
}
function assertExpressionWrapper(node, opts) {
  assert("ExpressionWrapper", node, opts);
}
function assertFor(node, opts) {
  assert("For", node, opts);
}
function assertForXStatement(node, opts) {
  assert("ForXStatement", node, opts);
}
function assertFunction(node, opts) {
  assert("Function", node, opts);
}
function assertFunctionParent(node, opts) {
  assert("FunctionParent", node, opts);
}
function assertPureish(node, opts) {
  assert("Pureish", node, opts);
}
function assertDeclaration(node, opts) {
  assert("Declaration", node, opts);
}
function assertPatternLike(node, opts) {
  assert("PatternLike", node, opts);
}
function assertLVal(node, opts) {
  assert("LVal", node, opts);
}
function assertTSEntityName(node, opts) {
  assert("TSEntityName", node, opts);
}
function assertLiteral(node, opts) {
  assert("Literal", node, opts);
}
function assertImmutable(node, opts) {
  assert("Immutable", node, opts);
}
function assertUserWhitespacable(node, opts) {
  assert("UserWhitespacable", node, opts);
}
function assertMethod(node, opts) {
  assert("Method", node, opts);
}
function assertObjectMember(node, opts) {
  assert("ObjectMember", node, opts);
}
function assertProperty(node, opts) {
  assert("Property", node, opts);
}
function assertUnaryLike(node, opts) {
  assert("UnaryLike", node, opts);
}
function assertPattern(node, opts) {
  assert("Pattern", node, opts);
}
function assertClass(node, opts) {
  assert("Class", node, opts);
}
function assertImportOrExportDeclaration(node, opts) {
  assert("ImportOrExportDeclaration", node, opts);
}
function assertExportDeclaration(node, opts) {
  assert("ExportDeclaration", node, opts);
}
function assertModuleSpecifier(node, opts) {
  assert("ModuleSpecifier", node, opts);
}
function assertAccessor(node, opts) {
  assert("Accessor", node, opts);
}
function assertPrivate(node, opts) {
  assert("Private", node, opts);
}
function assertFlow(node, opts) {
  assert("Flow", node, opts);
}
function assertFlowType(node, opts) {
  assert("FlowType", node, opts);
}
function assertFlowBaseAnnotation(node, opts) {
  assert("FlowBaseAnnotation", node, opts);
}
function assertFlowDeclaration(node, opts) {
  assert("FlowDeclaration", node, opts);
}
function assertFlowPredicate(node, opts) {
  assert("FlowPredicate", node, opts);
}
function assertEnumBody(node, opts) {
  assert("EnumBody", node, opts);
}
function assertEnumMember(node, opts) {
  assert("EnumMember", node, opts);
}
function assertJSX(node, opts) {
  assert("JSX", node, opts);
}
function assertMiscellaneous(node, opts) {
  assert("Miscellaneous", node, opts);
}
function assertTypeScript(node, opts) {
  assert("TypeScript", node, opts);
}
function assertTSTypeElement(node, opts) {
  assert("TSTypeElement", node, opts);
}
function assertTSType(node, opts) {
  assert("TSType", node, opts);
}
function assertTSBaseType(node, opts) {
  assert("TSBaseType", node, opts);
}
function assertNumberLiteral(node, opts) {
  (0, _deprecationWarning.default)("assertNumberLiteral", "assertNumericLiteral");
  assert("NumberLiteral", node, opts);
}
function assertRegexLiteral(node, opts) {
  (0, _deprecationWarning.default)("assertRegexLiteral", "assertRegExpLiteral");
  assert("RegexLiteral", node, opts);
}
function assertRestProperty(node, opts) {
  (0, _deprecationWarning.default)("assertRestProperty", "assertRestElement");
  assert("RestProperty", node, opts);
}
function assertSpreadProperty(node, opts) {
  (0, _deprecationWarning.default)("assertSpreadProperty", "assertSpreadElement");
  assert("SpreadProperty", node, opts);
}
function assertModuleDeclaration(node, opts) {
  (0, _deprecationWarning.default)("assertModuleDeclaration", "assertImportOrExportDeclaration");
  assert("ModuleDeclaration", node, opts);
}



},{"../../utils/deprecationWarning.js":81,"../../validators/is.js":87}],26:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = createFlowUnionType;
var _index = require("../generated/index.js");
var _removeTypeDuplicates = require("../../modifications/flow/removeTypeDuplicates.js");
function createFlowUnionType(types) {
  const flattened = (0, _removeTypeDuplicates.default)(types);
  if (flattened.length === 1) {
    return flattened[0];
  } else {
    return (0, _index.unionTypeAnnotation)(flattened);
  }
}



},{"../../modifications/flow/removeTypeDuplicates.js":71,"../generated/index.js":28}],27:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _index = require("../generated/index.js");
var _default = exports.default = createTypeAnnotationBasedOnTypeof;
function createTypeAnnotationBasedOnTypeof(type) {
  switch (type) {
    case "string":
      return (0, _index.stringTypeAnnotation)();
    case "number":
      return (0, _index.numberTypeAnnotation)();
    case "undefined":
      return (0, _index.voidTypeAnnotation)();
    case "boolean":
      return (0, _index.booleanTypeAnnotation)();
    case "function":
      return (0, _index.genericTypeAnnotation)((0, _index.identifier)("Function"));
    case "object":
      return (0, _index.genericTypeAnnotation)((0, _index.identifier)("Object"));
    case "symbol":
      return (0, _index.genericTypeAnnotation)((0, _index.identifier)("Symbol"));
    case "bigint":
      return (0, _index.anyTypeAnnotation)();
  }
  throw new Error("Invalid typeof value: " + type);
}



},{"../generated/index.js":28}],28:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.anyTypeAnnotation = anyTypeAnnotation;
exports.argumentPlaceholder = argumentPlaceholder;
exports.arrayExpression = arrayExpression;
exports.arrayPattern = arrayPattern;
exports.arrayTypeAnnotation = arrayTypeAnnotation;
exports.arrowFunctionExpression = arrowFunctionExpression;
exports.assignmentExpression = assignmentExpression;
exports.assignmentPattern = assignmentPattern;
exports.awaitExpression = awaitExpression;
exports.bigIntLiteral = bigIntLiteral;
exports.binaryExpression = binaryExpression;
exports.bindExpression = bindExpression;
exports.blockStatement = blockStatement;
exports.booleanLiteral = booleanLiteral;
exports.booleanLiteralTypeAnnotation = booleanLiteralTypeAnnotation;
exports.booleanTypeAnnotation = booleanTypeAnnotation;
exports.breakStatement = breakStatement;
exports.callExpression = callExpression;
exports.catchClause = catchClause;
exports.classAccessorProperty = classAccessorProperty;
exports.classBody = classBody;
exports.classDeclaration = classDeclaration;
exports.classExpression = classExpression;
exports.classImplements = classImplements;
exports.classMethod = classMethod;
exports.classPrivateMethod = classPrivateMethod;
exports.classPrivateProperty = classPrivateProperty;
exports.classProperty = classProperty;
exports.conditionalExpression = conditionalExpression;
exports.continueStatement = continueStatement;
exports.debuggerStatement = debuggerStatement;
exports.decimalLiteral = decimalLiteral;
exports.declareClass = declareClass;
exports.declareExportAllDeclaration = declareExportAllDeclaration;
exports.declareExportDeclaration = declareExportDeclaration;
exports.declareFunction = declareFunction;
exports.declareInterface = declareInterface;
exports.declareModule = declareModule;
exports.declareModuleExports = declareModuleExports;
exports.declareOpaqueType = declareOpaqueType;
exports.declareTypeAlias = declareTypeAlias;
exports.declareVariable = declareVariable;
exports.declaredPredicate = declaredPredicate;
exports.decorator = decorator;
exports.directive = directive;
exports.directiveLiteral = directiveLiteral;
exports.doExpression = doExpression;
exports.doWhileStatement = doWhileStatement;
exports.emptyStatement = emptyStatement;
exports.emptyTypeAnnotation = emptyTypeAnnotation;
exports.enumBooleanBody = enumBooleanBody;
exports.enumBooleanMember = enumBooleanMember;
exports.enumDeclaration = enumDeclaration;
exports.enumDefaultedMember = enumDefaultedMember;
exports.enumNumberBody = enumNumberBody;
exports.enumNumberMember = enumNumberMember;
exports.enumStringBody = enumStringBody;
exports.enumStringMember = enumStringMember;
exports.enumSymbolBody = enumSymbolBody;
exports.existsTypeAnnotation = existsTypeAnnotation;
exports.exportAllDeclaration = exportAllDeclaration;
exports.exportDefaultDeclaration = exportDefaultDeclaration;
exports.exportDefaultSpecifier = exportDefaultSpecifier;
exports.exportNamedDeclaration = exportNamedDeclaration;
exports.exportNamespaceSpecifier = exportNamespaceSpecifier;
exports.exportSpecifier = exportSpecifier;
exports.expressionStatement = expressionStatement;
exports.file = file;
exports.forInStatement = forInStatement;
exports.forOfStatement = forOfStatement;
exports.forStatement = forStatement;
exports.functionDeclaration = functionDeclaration;
exports.functionExpression = functionExpression;
exports.functionTypeAnnotation = functionTypeAnnotation;
exports.functionTypeParam = functionTypeParam;
exports.genericTypeAnnotation = genericTypeAnnotation;
exports.identifier = identifier;
exports.ifStatement = ifStatement;
exports.import = _import;
exports.importAttribute = importAttribute;
exports.importDeclaration = importDeclaration;
exports.importDefaultSpecifier = importDefaultSpecifier;
exports.importExpression = importExpression;
exports.importNamespaceSpecifier = importNamespaceSpecifier;
exports.importSpecifier = importSpecifier;
exports.indexedAccessType = indexedAccessType;
exports.inferredPredicate = inferredPredicate;
exports.interfaceDeclaration = interfaceDeclaration;
exports.interfaceExtends = interfaceExtends;
exports.interfaceTypeAnnotation = interfaceTypeAnnotation;
exports.interpreterDirective = interpreterDirective;
exports.intersectionTypeAnnotation = intersectionTypeAnnotation;
exports.jSXAttribute = exports.jsxAttribute = jsxAttribute;
exports.jSXClosingElement = exports.jsxClosingElement = jsxClosingElement;
exports.jSXClosingFragment = exports.jsxClosingFragment = jsxClosingFragment;
exports.jSXElement = exports.jsxElement = jsxElement;
exports.jSXEmptyExpression = exports.jsxEmptyExpression = jsxEmptyExpression;
exports.jSXExpressionContainer = exports.jsxExpressionContainer = jsxExpressionContainer;
exports.jSXFragment = exports.jsxFragment = jsxFragment;
exports.jSXIdentifier = exports.jsxIdentifier = jsxIdentifier;
exports.jSXMemberExpression = exports.jsxMemberExpression = jsxMemberExpression;
exports.jSXNamespacedName = exports.jsxNamespacedName = jsxNamespacedName;
exports.jSXOpeningElement = exports.jsxOpeningElement = jsxOpeningElement;
exports.jSXOpeningFragment = exports.jsxOpeningFragment = jsxOpeningFragment;
exports.jSXSpreadAttribute = exports.jsxSpreadAttribute = jsxSpreadAttribute;
exports.jSXSpreadChild = exports.jsxSpreadChild = jsxSpreadChild;
exports.jSXText = exports.jsxText = jsxText;
exports.labeledStatement = labeledStatement;
exports.logicalExpression = logicalExpression;
exports.memberExpression = memberExpression;
exports.metaProperty = metaProperty;
exports.mixedTypeAnnotation = mixedTypeAnnotation;
exports.moduleExpression = moduleExpression;
exports.newExpression = newExpression;
exports.noop = noop;
exports.nullLiteral = nullLiteral;
exports.nullLiteralTypeAnnotation = nullLiteralTypeAnnotation;
exports.nullableTypeAnnotation = nullableTypeAnnotation;
exports.numberLiteral = NumberLiteral;
exports.numberLiteralTypeAnnotation = numberLiteralTypeAnnotation;
exports.numberTypeAnnotation = numberTypeAnnotation;
exports.numericLiteral = numericLiteral;
exports.objectExpression = objectExpression;
exports.objectMethod = objectMethod;
exports.objectPattern = objectPattern;
exports.objectProperty = objectProperty;
exports.objectTypeAnnotation = objectTypeAnnotation;
exports.objectTypeCallProperty = objectTypeCallProperty;
exports.objectTypeIndexer = objectTypeIndexer;
exports.objectTypeInternalSlot = objectTypeInternalSlot;
exports.objectTypeProperty = objectTypeProperty;
exports.objectTypeSpreadProperty = objectTypeSpreadProperty;
exports.opaqueType = opaqueType;
exports.optionalCallExpression = optionalCallExpression;
exports.optionalIndexedAccessType = optionalIndexedAccessType;
exports.optionalMemberExpression = optionalMemberExpression;
exports.parenthesizedExpression = parenthesizedExpression;
exports.pipelineBareFunction = pipelineBareFunction;
exports.pipelinePrimaryTopicReference = pipelinePrimaryTopicReference;
exports.pipelineTopicExpression = pipelineTopicExpression;
exports.placeholder = placeholder;
exports.privateName = privateName;
exports.program = program;
exports.qualifiedTypeIdentifier = qualifiedTypeIdentifier;
exports.recordExpression = recordExpression;
exports.regExpLiteral = regExpLiteral;
exports.regexLiteral = RegexLiteral;
exports.restElement = restElement;
exports.restProperty = RestProperty;
exports.returnStatement = returnStatement;
exports.sequenceExpression = sequenceExpression;
exports.spreadElement = spreadElement;
exports.spreadProperty = SpreadProperty;
exports.staticBlock = staticBlock;
exports.stringLiteral = stringLiteral;
exports.stringLiteralTypeAnnotation = stringLiteralTypeAnnotation;
exports.stringTypeAnnotation = stringTypeAnnotation;
exports.super = _super;
exports.switchCase = switchCase;
exports.switchStatement = switchStatement;
exports.symbolTypeAnnotation = symbolTypeAnnotation;
exports.taggedTemplateExpression = taggedTemplateExpression;
exports.templateElement = templateElement;
exports.templateLiteral = templateLiteral;
exports.thisExpression = thisExpression;
exports.thisTypeAnnotation = thisTypeAnnotation;
exports.throwStatement = throwStatement;
exports.topicReference = topicReference;
exports.tryStatement = tryStatement;
exports.tSAnyKeyword = exports.tsAnyKeyword = tsAnyKeyword;
exports.tSArrayType = exports.tsArrayType = tsArrayType;
exports.tSAsExpression = exports.tsAsExpression = tsAsExpression;
exports.tSBigIntKeyword = exports.tsBigIntKeyword = tsBigIntKeyword;
exports.tSBooleanKeyword = exports.tsBooleanKeyword = tsBooleanKeyword;
exports.tSCallSignatureDeclaration = exports.tsCallSignatureDeclaration = tsCallSignatureDeclaration;
exports.tSConditionalType = exports.tsConditionalType = tsConditionalType;
exports.tSConstructSignatureDeclaration = exports.tsConstructSignatureDeclaration = tsConstructSignatureDeclaration;
exports.tSConstructorType = exports.tsConstructorType = tsConstructorType;
exports.tSDeclareFunction = exports.tsDeclareFunction = tsDeclareFunction;
exports.tSDeclareMethod = exports.tsDeclareMethod = tsDeclareMethod;
exports.tSEnumDeclaration = exports.tsEnumDeclaration = tsEnumDeclaration;
exports.tSEnumMember = exports.tsEnumMember = tsEnumMember;
exports.tSExportAssignment = exports.tsExportAssignment = tsExportAssignment;
exports.tSExpressionWithTypeArguments = exports.tsExpressionWithTypeArguments = tsExpressionWithTypeArguments;
exports.tSExternalModuleReference = exports.tsExternalModuleReference = tsExternalModuleReference;
exports.tSFunctionType = exports.tsFunctionType = tsFunctionType;
exports.tSImportEqualsDeclaration = exports.tsImportEqualsDeclaration = tsImportEqualsDeclaration;
exports.tSImportType = exports.tsImportType = tsImportType;
exports.tSIndexSignature = exports.tsIndexSignature = tsIndexSignature;
exports.tSIndexedAccessType = exports.tsIndexedAccessType = tsIndexedAccessType;
exports.tSInferType = exports.tsInferType = tsInferType;
exports.tSInstantiationExpression = exports.tsInstantiationExpression = tsInstantiationExpression;
exports.tSInterfaceBody = exports.tsInterfaceBody = tsInterfaceBody;
exports.tSInterfaceDeclaration = exports.tsInterfaceDeclaration = tsInterfaceDeclaration;
exports.tSIntersectionType = exports.tsIntersectionType = tsIntersectionType;
exports.tSIntrinsicKeyword = exports.tsIntrinsicKeyword = tsIntrinsicKeyword;
exports.tSLiteralType = exports.tsLiteralType = tsLiteralType;
exports.tSMappedType = exports.tsMappedType = tsMappedType;
exports.tSMethodSignature = exports.tsMethodSignature = tsMethodSignature;
exports.tSModuleBlock = exports.tsModuleBlock = tsModuleBlock;
exports.tSModuleDeclaration = exports.tsModuleDeclaration = tsModuleDeclaration;
exports.tSNamedTupleMember = exports.tsNamedTupleMember = tsNamedTupleMember;
exports.tSNamespaceExportDeclaration = exports.tsNamespaceExportDeclaration = tsNamespaceExportDeclaration;
exports.tSNeverKeyword = exports.tsNeverKeyword = tsNeverKeyword;
exports.tSNonNullExpression = exports.tsNonNullExpression = tsNonNullExpression;
exports.tSNullKeyword = exports.tsNullKeyword = tsNullKeyword;
exports.tSNumberKeyword = exports.tsNumberKeyword = tsNumberKeyword;
exports.tSObjectKeyword = exports.tsObjectKeyword = tsObjectKeyword;
exports.tSOptionalType = exports.tsOptionalType = tsOptionalType;
exports.tSParameterProperty = exports.tsParameterProperty = tsParameterProperty;
exports.tSParenthesizedType = exports.tsParenthesizedType = tsParenthesizedType;
exports.tSPropertySignature = exports.tsPropertySignature = tsPropertySignature;
exports.tSQualifiedName = exports.tsQualifiedName = tsQualifiedName;
exports.tSRestType = exports.tsRestType = tsRestType;
exports.tSSatisfiesExpression = exports.tsSatisfiesExpression = tsSatisfiesExpression;
exports.tSStringKeyword = exports.tsStringKeyword = tsStringKeyword;
exports.tSSymbolKeyword = exports.tsSymbolKeyword = tsSymbolKeyword;
exports.tSThisType = exports.tsThisType = tsThisType;
exports.tSTupleType = exports.tsTupleType = tsTupleType;
exports.tSTypeAliasDeclaration = exports.tsTypeAliasDeclaration = tsTypeAliasDeclaration;
exports.tSTypeAnnotation = exports.tsTypeAnnotation = tsTypeAnnotation;
exports.tSTypeAssertion = exports.tsTypeAssertion = tsTypeAssertion;
exports.tSTypeLiteral = exports.tsTypeLiteral = tsTypeLiteral;
exports.tSTypeOperator = exports.tsTypeOperator = tsTypeOperator;
exports.tSTypeParameter = exports.tsTypeParameter = tsTypeParameter;
exports.tSTypeParameterDeclaration = exports.tsTypeParameterDeclaration = tsTypeParameterDeclaration;
exports.tSTypeParameterInstantiation = exports.tsTypeParameterInstantiation = tsTypeParameterInstantiation;
exports.tSTypePredicate = exports.tsTypePredicate = tsTypePredicate;
exports.tSTypeQuery = exports.tsTypeQuery = tsTypeQuery;
exports.tSTypeReference = exports.tsTypeReference = tsTypeReference;
exports.tSUndefinedKeyword = exports.tsUndefinedKeyword = tsUndefinedKeyword;
exports.tSUnionType = exports.tsUnionType = tsUnionType;
exports.tSUnknownKeyword = exports.tsUnknownKeyword = tsUnknownKeyword;
exports.tSVoidKeyword = exports.tsVoidKeyword = tsVoidKeyword;
exports.tupleExpression = tupleExpression;
exports.tupleTypeAnnotation = tupleTypeAnnotation;
exports.typeAlias = typeAlias;
exports.typeAnnotation = typeAnnotation;
exports.typeCastExpression = typeCastExpression;
exports.typeParameter = typeParameter;
exports.typeParameterDeclaration = typeParameterDeclaration;
exports.typeParameterInstantiation = typeParameterInstantiation;
exports.typeofTypeAnnotation = typeofTypeAnnotation;
exports.unaryExpression = unaryExpression;
exports.unionTypeAnnotation = unionTypeAnnotation;
exports.updateExpression = updateExpression;
exports.v8IntrinsicIdentifier = v8IntrinsicIdentifier;
exports.variableDeclaration = variableDeclaration;
exports.variableDeclarator = variableDeclarator;
exports.variance = variance;
exports.voidTypeAnnotation = voidTypeAnnotation;
exports.whileStatement = whileStatement;
exports.withStatement = withStatement;
exports.yieldExpression = yieldExpression;
var _validateNode = require("../validateNode.js");
var _deprecationWarning = require("../../utils/deprecationWarning.js");
function arrayExpression(elements = []) {
  return (0, _validateNode.default)({
    type: "ArrayExpression",
    elements
  });
}
function assignmentExpression(operator, left, right) {
  return (0, _validateNode.default)({
    type: "AssignmentExpression",
    operator,
    left,
    right
  });
}
function binaryExpression(operator, left, right) {
  return (0, _validateNode.default)({
    type: "BinaryExpression",
    operator,
    left,
    right
  });
}
function interpreterDirective(value) {
  return (0, _validateNode.default)({
    type: "InterpreterDirective",
    value
  });
}
function directive(value) {
  return (0, _validateNode.default)({
    type: "Directive",
    value
  });
}
function directiveLiteral(value) {
  return (0, _validateNode.default)({
    type: "DirectiveLiteral",
    value
  });
}
function blockStatement(body, directives = []) {
  return (0, _validateNode.default)({
    type: "BlockStatement",
    body,
    directives
  });
}
function breakStatement(label = null) {
  return (0, _validateNode.default)({
    type: "BreakStatement",
    label
  });
}
function callExpression(callee, _arguments) {
  return (0, _validateNode.default)({
    type: "CallExpression",
    callee,
    arguments: _arguments
  });
}
function catchClause(param = null, body) {
  return (0, _validateNode.default)({
    type: "CatchClause",
    param,
    body
  });
}
function conditionalExpression(test, consequent, alternate) {
  return (0, _validateNode.default)({
    type: "ConditionalExpression",
    test,
    consequent,
    alternate
  });
}
function continueStatement(label = null) {
  return (0, _validateNode.default)({
    type: "ContinueStatement",
    label
  });
}
function debuggerStatement() {
  return {
    type: "DebuggerStatement"
  };
}
function doWhileStatement(test, body) {
  return (0, _validateNode.default)({
    type: "DoWhileStatement",
    test,
    body
  });
}
function emptyStatement() {
  return {
    type: "EmptyStatement"
  };
}
function expressionStatement(expression) {
  return (0, _validateNode.default)({
    type: "ExpressionStatement",
    expression
  });
}
function file(program, comments = null, tokens = null) {
  return (0, _validateNode.default)({
    type: "File",
    program,
    comments,
    tokens
  });
}
function forInStatement(left, right, body) {
  return (0, _validateNode.default)({
    type: "ForInStatement",
    left,
    right,
    body
  });
}
function forStatement(init = null, test = null, update = null, body) {
  return (0, _validateNode.default)({
    type: "ForStatement",
    init,
    test,
    update,
    body
  });
}
function functionDeclaration(id = null, params, body, generator = false, async = false) {
  return (0, _validateNode.default)({
    type: "FunctionDeclaration",
    id,
    params,
    body,
    generator,
    async
  });
}
function functionExpression(id = null, params, body, generator = false, async = false) {
  return (0, _validateNode.default)({
    type: "FunctionExpression",
    id,
    params,
    body,
    generator,
    async
  });
}
function identifier(name) {
  return (0, _validateNode.default)({
    type: "Identifier",
    name
  });
}
function ifStatement(test, consequent, alternate = null) {
  return (0, _validateNode.default)({
    type: "IfStatement",
    test,
    consequent,
    alternate
  });
}
function labeledStatement(label, body) {
  return (0, _validateNode.default)({
    type: "LabeledStatement",
    label,
    body
  });
}
function stringLiteral(value) {
  return (0, _validateNode.default)({
    type: "StringLiteral",
    value
  });
}
function numericLiteral(value) {
  return (0, _validateNode.default)({
    type: "NumericLiteral",
    value
  });
}
function nullLiteral() {
  return {
    type: "NullLiteral"
  };
}
function booleanLiteral(value) {
  return (0, _validateNode.default)({
    type: "BooleanLiteral",
    value
  });
}
function regExpLiteral(pattern, flags = "") {
  return (0, _validateNode.default)({
    type: "RegExpLiteral",
    pattern,
    flags
  });
}
function logicalExpression(operator, left, right) {
  return (0, _validateNode.default)({
    type: "LogicalExpression",
    operator,
    left,
    right
  });
}
function memberExpression(object, property, computed = false, optional = null) {
  return (0, _validateNode.default)({
    type: "MemberExpression",
    object,
    property,
    computed,
    optional
  });
}
function newExpression(callee, _arguments) {
  return (0, _validateNode.default)({
    type: "NewExpression",
    callee,
    arguments: _arguments
  });
}
function program(body, directives = [], sourceType = "script", interpreter = null) {
  return (0, _validateNode.default)({
    type: "Program",
    body,
    directives,
    sourceType,
    interpreter,
    sourceFile: null
  });
}
function objectExpression(properties) {
  return (0, _validateNode.default)({
    type: "ObjectExpression",
    properties
  });
}
function objectMethod(kind = "method", key, params, body, computed = false, generator = false, async = false) {
  return (0, _validateNode.default)({
    type: "ObjectMethod",
    kind,
    key,
    params,
    body,
    computed,
    generator,
    async
  });
}
function objectProperty(key, value, computed = false, shorthand = false, decorators = null) {
  return (0, _validateNode.default)({
    type: "ObjectProperty",
    key,
    value,
    computed,
    shorthand,
    decorators
  });
}
function restElement(argument) {
  return (0, _validateNode.default)({
    type: "RestElement",
    argument
  });
}
function returnStatement(argument = null) {
  return (0, _validateNode.default)({
    type: "ReturnStatement",
    argument
  });
}
function sequenceExpression(expressions) {
  return (0, _validateNode.default)({
    type: "SequenceExpression",
    expressions
  });
}
function parenthesizedExpression(expression) {
  return (0, _validateNode.default)({
    type: "ParenthesizedExpression",
    expression
  });
}
function switchCase(test = null, consequent) {
  return (0, _validateNode.default)({
    type: "SwitchCase",
    test,
    consequent
  });
}
function switchStatement(discriminant, cases) {
  return (0, _validateNode.default)({
    type: "SwitchStatement",
    discriminant,
    cases
  });
}
function thisExpression() {
  return {
    type: "ThisExpression"
  };
}
function throwStatement(argument) {
  return (0, _validateNode.default)({
    type: "ThrowStatement",
    argument
  });
}
function tryStatement(block, handler = null, finalizer = null) {
  return (0, _validateNode.default)({
    type: "TryStatement",
    block,
    handler,
    finalizer
  });
}
function unaryExpression(operator, argument, prefix = true) {
  return (0, _validateNode.default)({
    type: "UnaryExpression",
    operator,
    argument,
    prefix
  });
}
function updateExpression(operator, argument, prefix = false) {
  return (0, _validateNode.default)({
    type: "UpdateExpression",
    operator,
    argument,
    prefix
  });
}
function variableDeclaration(kind, declarations) {
  return (0, _validateNode.default)({
    type: "VariableDeclaration",
    kind,
    declarations
  });
}
function variableDeclarator(id, init = null) {
  return (0, _validateNode.default)({
    type: "VariableDeclarator",
    id,
    init
  });
}
function whileStatement(test, body) {
  return (0, _validateNode.default)({
    type: "WhileStatement",
    test,
    body
  });
}
function withStatement(object, body) {
  return (0, _validateNode.default)({
    type: "WithStatement",
    object,
    body
  });
}
function assignmentPattern(left, right) {
  return (0, _validateNode.default)({
    type: "AssignmentPattern",
    left,
    right
  });
}
function arrayPattern(elements) {
  return (0, _validateNode.default)({
    type: "ArrayPattern",
    elements
  });
}
function arrowFunctionExpression(params, body, async = false) {
  return (0, _validateNode.default)({
    type: "ArrowFunctionExpression",
    params,
    body,
    async,
    expression: null
  });
}
function classBody(body) {
  return (0, _validateNode.default)({
    type: "ClassBody",
    body
  });
}
function classExpression(id = null, superClass = null, body, decorators = null) {
  return (0, _validateNode.default)({
    type: "ClassExpression",
    id,
    superClass,
    body,
    decorators
  });
}
function classDeclaration(id = null, superClass = null, body, decorators = null) {
  return (0, _validateNode.default)({
    type: "ClassDeclaration",
    id,
    superClass,
    body,
    decorators
  });
}
function exportAllDeclaration(source) {
  return (0, _validateNode.default)({
    type: "ExportAllDeclaration",
    source
  });
}
function exportDefaultDeclaration(declaration) {
  return (0, _validateNode.default)({
    type: "ExportDefaultDeclaration",
    declaration
  });
}
function exportNamedDeclaration(declaration = null, specifiers = [], source = null) {
  return (0, _validateNode.default)({
    type: "ExportNamedDeclaration",
    declaration,
    specifiers,
    source
  });
}
function exportSpecifier(local, exported) {
  return (0, _validateNode.default)({
    type: "ExportSpecifier",
    local,
    exported
  });
}
function forOfStatement(left, right, body, _await = false) {
  return (0, _validateNode.default)({
    type: "ForOfStatement",
    left,
    right,
    body,
    await: _await
  });
}
function importDeclaration(specifiers, source) {
  return (0, _validateNode.default)({
    type: "ImportDeclaration",
    specifiers,
    source
  });
}
function importDefaultSpecifier(local) {
  return (0, _validateNode.default)({
    type: "ImportDefaultSpecifier",
    local
  });
}
function importNamespaceSpecifier(local) {
  return (0, _validateNode.default)({
    type: "ImportNamespaceSpecifier",
    local
  });
}
function importSpecifier(local, imported) {
  return (0, _validateNode.default)({
    type: "ImportSpecifier",
    local,
    imported
  });
}
function importExpression(source, options = null) {
  return (0, _validateNode.default)({
    type: "ImportExpression",
    source,
    options
  });
}
function metaProperty(meta, property) {
  return (0, _validateNode.default)({
    type: "MetaProperty",
    meta,
    property
  });
}
function classMethod(kind = "method", key, params, body, computed = false, _static = false, generator = false, async = false) {
  return (0, _validateNode.default)({
    type: "ClassMethod",
    kind,
    key,
    params,
    body,
    computed,
    static: _static,
    generator,
    async
  });
}
function objectPattern(properties) {
  return (0, _validateNode.default)({
    type: "ObjectPattern",
    properties
  });
}
function spreadElement(argument) {
  return (0, _validateNode.default)({
    type: "SpreadElement",
    argument
  });
}
function _super() {
  return {
    type: "Super"
  };
}
function taggedTemplateExpression(tag, quasi) {
  return (0, _validateNode.default)({
    type: "TaggedTemplateExpression",
    tag,
    quasi
  });
}
function templateElement(value, tail = false) {
  return (0, _validateNode.default)({
    type: "TemplateElement",
    value,
    tail
  });
}
function templateLiteral(quasis, expressions) {
  return (0, _validateNode.default)({
    type: "TemplateLiteral",
    quasis,
    expressions
  });
}
function yieldExpression(argument = null, delegate = false) {
  return (0, _validateNode.default)({
    type: "YieldExpression",
    argument,
    delegate
  });
}
function awaitExpression(argument) {
  return (0, _validateNode.default)({
    type: "AwaitExpression",
    argument
  });
}
function _import() {
  return {
    type: "Import"
  };
}
function bigIntLiteral(value) {
  return (0, _validateNode.default)({
    type: "BigIntLiteral",
    value
  });
}
function exportNamespaceSpecifier(exported) {
  return (0, _validateNode.default)({
    type: "ExportNamespaceSpecifier",
    exported
  });
}
function optionalMemberExpression(object, property, computed = false, optional) {
  return (0, _validateNode.default)({
    type: "OptionalMemberExpression",
    object,
    property,
    computed,
    optional
  });
}
function optionalCallExpression(callee, _arguments, optional) {
  return (0, _validateNode.default)({
    type: "OptionalCallExpression",
    callee,
    arguments: _arguments,
    optional
  });
}
function classProperty(key, value = null, typeAnnotation = null, decorators = null, computed = false, _static = false) {
  return (0, _validateNode.default)({
    type: "ClassProperty",
    key,
    value,
    typeAnnotation,
    decorators,
    computed,
    static: _static
  });
}
function classAccessorProperty(key, value = null, typeAnnotation = null, decorators = null, computed = false, _static = false) {
  return (0, _validateNode.default)({
    type: "ClassAccessorProperty",
    key,
    value,
    typeAnnotation,
    decorators,
    computed,
    static: _static
  });
}
function classPrivateProperty(key, value = null, decorators = null, _static = false) {
  return (0, _validateNode.default)({
    type: "ClassPrivateProperty",
    key,
    value,
    decorators,
    static: _static
  });
}
function classPrivateMethod(kind = "method", key, params, body, _static = false) {
  return (0, _validateNode.default)({
    type: "ClassPrivateMethod",
    kind,
    key,
    params,
    body,
    static: _static
  });
}
function privateName(id) {
  return (0, _validateNode.default)({
    type: "PrivateName",
    id
  });
}
function staticBlock(body) {
  return (0, _validateNode.default)({
    type: "StaticBlock",
    body
  });
}
function anyTypeAnnotation() {
  return {
    type: "AnyTypeAnnotation"
  };
}
function arrayTypeAnnotation(elementType) {
  return (0, _validateNode.default)({
    type: "ArrayTypeAnnotation",
    elementType
  });
}
function booleanTypeAnnotation() {
  return {
    type: "BooleanTypeAnnotation"
  };
}
function booleanLiteralTypeAnnotation(value) {
  return (0, _validateNode.default)({
    type: "BooleanLiteralTypeAnnotation",
    value
  });
}
function nullLiteralTypeAnnotation() {
  return {
    type: "NullLiteralTypeAnnotation"
  };
}
function classImplements(id, typeParameters = null) {
  return (0, _validateNode.default)({
    type: "ClassImplements",
    id,
    typeParameters
  });
}
function declareClass(id, typeParameters = null, _extends = null, body) {
  return (0, _validateNode.default)({
    type: "DeclareClass",
    id,
    typeParameters,
    extends: _extends,
    body
  });
}
function declareFunction(id) {
  return (0, _validateNode.default)({
    type: "DeclareFunction",
    id
  });
}
function declareInterface(id, typeParameters = null, _extends = null, body) {
  return (0, _validateNode.default)({
    type: "DeclareInterface",
    id,
    typeParameters,
    extends: _extends,
    body
  });
}
function declareModule(id, body, kind = null) {
  return (0, _validateNode.default)({
    type: "DeclareModule",
    id,
    body,
    kind
  });
}
function declareModuleExports(typeAnnotation) {
  return (0, _validateNode.default)({
    type: "DeclareModuleExports",
    typeAnnotation
  });
}
function declareTypeAlias(id, typeParameters = null, right) {
  return (0, _validateNode.default)({
    type: "DeclareTypeAlias",
    id,
    typeParameters,
    right
  });
}
function declareOpaqueType(id, typeParameters = null, supertype = null) {
  return (0, _validateNode.default)({
    type: "DeclareOpaqueType",
    id,
    typeParameters,
    supertype
  });
}
function declareVariable(id) {
  return (0, _validateNode.default)({
    type: "DeclareVariable",
    id
  });
}
function declareExportDeclaration(declaration = null, specifiers = null, source = null) {
  return (0, _validateNode.default)({
    type: "DeclareExportDeclaration",
    declaration,
    specifiers,
    source
  });
}
function declareExportAllDeclaration(source) {
  return (0, _validateNode.default)({
    type: "DeclareExportAllDeclaration",
    source
  });
}
function declaredPredicate(value) {
  return (0, _validateNode.default)({
    type: "DeclaredPredicate",
    value
  });
}
function existsTypeAnnotation() {
  return {
    type: "ExistsTypeAnnotation"
  };
}
function functionTypeAnnotation(typeParameters = null, params, rest = null, returnType) {
  return (0, _validateNode.default)({
    type: "FunctionTypeAnnotation",
    typeParameters,
    params,
    rest,
    returnType
  });
}
function functionTypeParam(name = null, typeAnnotation) {
  return (0, _validateNode.default)({
    type: "FunctionTypeParam",
    name,
    typeAnnotation
  });
}
function genericTypeAnnotation(id, typeParameters = null) {
  return (0, _validateNode.default)({
    type: "GenericTypeAnnotation",
    id,
    typeParameters
  });
}
function inferredPredicate() {
  return {
    type: "InferredPredicate"
  };
}
function interfaceExtends(id, typeParameters = null) {
  return (0, _validateNode.default)({
    type: "InterfaceExtends",
    id,
    typeParameters
  });
}
function interfaceDeclaration(id, typeParameters = null, _extends = null, body) {
  return (0, _validateNode.default)({
    type: "InterfaceDeclaration",
    id,
    typeParameters,
    extends: _extends,
    body
  });
}
function interfaceTypeAnnotation(_extends = null, body) {
  return (0, _validateNode.default)({
    type: "InterfaceTypeAnnotation",
    extends: _extends,
    body
  });
}
function intersectionTypeAnnotation(types) {
  return (0, _validateNode.default)({
    type: "IntersectionTypeAnnotation",
    types
  });
}
function mixedTypeAnnotation() {
  return {
    type: "MixedTypeAnnotation"
  };
}
function emptyTypeAnnotation() {
  return {
    type: "EmptyTypeAnnotation"
  };
}
function nullableTypeAnnotation(typeAnnotation) {
  return (0, _validateNode.default)({
    type: "NullableTypeAnnotation",
    typeAnnotation
  });
}
function numberLiteralTypeAnnotation(value) {
  return (0, _validateNode.default)({
    type: "NumberLiteralTypeAnnotation",
    value
  });
}
function numberTypeAnnotation() {
  return {
    type: "NumberTypeAnnotation"
  };
}
function objectTypeAnnotation(properties, indexers = [], callProperties = [], internalSlots = [], exact = false) {
  return (0, _validateNode.default)({
    type: "ObjectTypeAnnotation",
    properties,
    indexers,
    callProperties,
    internalSlots,
    exact
  });
}
function objectTypeInternalSlot(id, value, optional, _static, method) {
  return (0, _validateNode.default)({
    type: "ObjectTypeInternalSlot",
    id,
    value,
    optional,
    static: _static,
    method
  });
}
function objectTypeCallProperty(value) {
  return (0, _validateNode.default)({
    type: "ObjectTypeCallProperty",
    value,
    static: null
  });
}
function objectTypeIndexer(id = null, key, value, variance = null) {
  return (0, _validateNode.default)({
    type: "ObjectTypeIndexer",
    id,
    key,
    value,
    variance,
    static: null
  });
}
function objectTypeProperty(key, value, variance = null) {
  return (0, _validateNode.default)({
    type: "ObjectTypeProperty",
    key,
    value,
    variance,
    kind: null,
    method: null,
    optional: null,
    proto: null,
    static: null
  });
}
function objectTypeSpreadProperty(argument) {
  return (0, _validateNode.default)({
    type: "ObjectTypeSpreadProperty",
    argument
  });
}
function opaqueType(id, typeParameters = null, supertype = null, impltype) {
  return (0, _validateNode.default)({
    type: "OpaqueType",
    id,
    typeParameters,
    supertype,
    impltype
  });
}
function qualifiedTypeIdentifier(id, qualification) {
  return (0, _validateNode.default)({
    type: "QualifiedTypeIdentifier",
    id,
    qualification
  });
}
function stringLiteralTypeAnnotation(value) {
  return (0, _validateNode.default)({
    type: "StringLiteralTypeAnnotation",
    value
  });
}
function stringTypeAnnotation() {
  return {
    type: "StringTypeAnnotation"
  };
}
function symbolTypeAnnotation() {
  return {
    type: "SymbolTypeAnnotation"
  };
}
function thisTypeAnnotation() {
  return {
    type: "ThisTypeAnnotation"
  };
}
function tupleTypeAnnotation(types) {
  return (0, _validateNode.default)({
    type: "TupleTypeAnnotation",
    types
  });
}
function typeofTypeAnnotation(argument) {
  return (0, _validateNode.default)({
    type: "TypeofTypeAnnotation",
    argument
  });
}
function typeAlias(id, typeParameters = null, right) {
  return (0, _validateNode.default)({
    type: "TypeAlias",
    id,
    typeParameters,
    right
  });
}
function typeAnnotation(typeAnnotation) {
  return (0, _validateNode.default)({
    type: "TypeAnnotation",
    typeAnnotation
  });
}
function typeCastExpression(expression, typeAnnotation) {
  return (0, _validateNode.default)({
    type: "TypeCastExpression",
    expression,
    typeAnnotation
  });
}
function typeParameter(bound = null, _default = null, variance = null) {
  return (0, _validateNode.default)({
    type: "TypeParameter",
    bound,
    default: _default,
    variance,
    name: null
  });
}
function typeParameterDeclaration(params) {
  return (0, _validateNode.default)({
    type: "TypeParameterDeclaration",
    params
  });
}
function typeParameterInstantiation(params) {
  return (0, _validateNode.default)({
    type: "TypeParameterInstantiation",
    params
  });
}
function unionTypeAnnotation(types) {
  return (0, _validateNode.default)({
    type: "UnionTypeAnnotation",
    types
  });
}
function variance(kind) {
  return (0, _validateNode.default)({
    type: "Variance",
    kind
  });
}
function voidTypeAnnotation() {
  return {
    type: "VoidTypeAnnotation"
  };
}
function enumDeclaration(id, body) {
  return (0, _validateNode.default)({
    type: "EnumDeclaration",
    id,
    body
  });
}
function enumBooleanBody(members) {
  return (0, _validateNode.default)({
    type: "EnumBooleanBody",
    members,
    explicitType: null,
    hasUnknownMembers: null
  });
}
function enumNumberBody(members) {
  return (0, _validateNode.default)({
    type: "EnumNumberBody",
    members,
    explicitType: null,
    hasUnknownMembers: null
  });
}
function enumStringBody(members) {
  return (0, _validateNode.default)({
    type: "EnumStringBody",
    members,
    explicitType: null,
    hasUnknownMembers: null
  });
}
function enumSymbolBody(members) {
  return (0, _validateNode.default)({
    type: "EnumSymbolBody",
    members,
    hasUnknownMembers: null
  });
}
function enumBooleanMember(id) {
  return (0, _validateNode.default)({
    type: "EnumBooleanMember",
    id,
    init: null
  });
}
function enumNumberMember(id, init) {
  return (0, _validateNode.default)({
    type: "EnumNumberMember",
    id,
    init
  });
}
function enumStringMember(id, init) {
  return (0, _validateNode.default)({
    type: "EnumStringMember",
    id,
    init
  });
}
function enumDefaultedMember(id) {
  return (0, _validateNode.default)({
    type: "EnumDefaultedMember",
    id
  });
}
function indexedAccessType(objectType, indexType) {
  return (0, _validateNode.default)({
    type: "IndexedAccessType",
    objectType,
    indexType
  });
}
function optionalIndexedAccessType(objectType, indexType) {
  return (0, _validateNode.default)({
    type: "OptionalIndexedAccessType",
    objectType,
    indexType,
    optional: null
  });
}
function jsxAttribute(name, value = null) {
  return (0, _validateNode.default)({
    type: "JSXAttribute",
    name,
    value
  });
}
function jsxClosingElement(name) {
  return (0, _validateNode.default)({
    type: "JSXClosingElement",
    name
  });
}
function jsxElement(openingElement, closingElement = null, children, selfClosing = null) {
  return (0, _validateNode.default)({
    type: "JSXElement",
    openingElement,
    closingElement,
    children,
    selfClosing
  });
}
function jsxEmptyExpression() {
  return {
    type: "JSXEmptyExpression"
  };
}
function jsxExpressionContainer(expression) {
  return (0, _validateNode.default)({
    type: "JSXExpressionContainer",
    expression
  });
}
function jsxSpreadChild(expression) {
  return (0, _validateNode.default)({
    type: "JSXSpreadChild",
    expression
  });
}
function jsxIdentifier(name) {
  return (0, _validateNode.default)({
    type: "JSXIdentifier",
    name
  });
}
function jsxMemberExpression(object, property) {
  return (0, _validateNode.default)({
    type: "JSXMemberExpression",
    object,
    property
  });
}
function jsxNamespacedName(namespace, name) {
  return (0, _validateNode.default)({
    type: "JSXNamespacedName",
    namespace,
    name
  });
}
function jsxOpeningElement(name, attributes, selfClosing = false) {
  return (0, _validateNode.default)({
    type: "JSXOpeningElement",
    name,
    attributes,
    selfClosing
  });
}
function jsxSpreadAttribute(argument) {
  return (0, _validateNode.default)({
    type: "JSXSpreadAttribute",
    argument
  });
}
function jsxText(value) {
  return (0, _validateNode.default)({
    type: "JSXText",
    value
  });
}
function jsxFragment(openingFragment, closingFragment, children) {
  return (0, _validateNode.default)({
    type: "JSXFragment",
    openingFragment,
    closingFragment,
    children
  });
}
function jsxOpeningFragment() {
  return {
    type: "JSXOpeningFragment"
  };
}
function jsxClosingFragment() {
  return {
    type: "JSXClosingFragment"
  };
}
function noop() {
  return {
    type: "Noop"
  };
}
function placeholder(expectedNode, name) {
  return (0, _validateNode.default)({
    type: "Placeholder",
    expectedNode,
    name
  });
}
function v8IntrinsicIdentifier(name) {
  return (0, _validateNode.default)({
    type: "V8IntrinsicIdentifier",
    name
  });
}
function argumentPlaceholder() {
  return {
    type: "ArgumentPlaceholder"
  };
}
function bindExpression(object, callee) {
  return (0, _validateNode.default)({
    type: "BindExpression",
    object,
    callee
  });
}
function importAttribute(key, value) {
  return (0, _validateNode.default)({
    type: "ImportAttribute",
    key,
    value
  });
}
function decorator(expression) {
  return (0, _validateNode.default)({
    type: "Decorator",
    expression
  });
}
function doExpression(body, async = false) {
  return (0, _validateNode.default)({
    type: "DoExpression",
    body,
    async
  });
}
function exportDefaultSpecifier(exported) {
  return (0, _validateNode.default)({
    type: "ExportDefaultSpecifier",
    exported
  });
}
function recordExpression(properties) {
  return (0, _validateNode.default)({
    type: "RecordExpression",
    properties
  });
}
function tupleExpression(elements = []) {
  return (0, _validateNode.default)({
    type: "TupleExpression",
    elements
  });
}
function decimalLiteral(value) {
  return (0, _validateNode.default)({
    type: "DecimalLiteral",
    value
  });
}
function moduleExpression(body) {
  return (0, _validateNode.default)({
    type: "ModuleExpression",
    body
  });
}
function topicReference() {
  return {
    type: "TopicReference"
  };
}
function pipelineTopicExpression(expression) {
  return (0, _validateNode.default)({
    type: "PipelineTopicExpression",
    expression
  });
}
function pipelineBareFunction(callee) {
  return (0, _validateNode.default)({
    type: "PipelineBareFunction",
    callee
  });
}
function pipelinePrimaryTopicReference() {
  return {
    type: "PipelinePrimaryTopicReference"
  };
}
function tsParameterProperty(parameter) {
  return (0, _validateNode.default)({
    type: "TSParameterProperty",
    parameter
  });
}
function tsDeclareFunction(id = null, typeParameters = null, params, returnType = null) {
  return (0, _validateNode.default)({
    type: "TSDeclareFunction",
    id,
    typeParameters,
    params,
    returnType
  });
}
function tsDeclareMethod(decorators = null, key, typeParameters = null, params, returnType = null) {
  return (0, _validateNode.default)({
    type: "TSDeclareMethod",
    decorators,
    key,
    typeParameters,
    params,
    returnType
  });
}
function tsQualifiedName(left, right) {
  return (0, _validateNode.default)({
    type: "TSQualifiedName",
    left,
    right
  });
}
function tsCallSignatureDeclaration(typeParameters = null, parameters, typeAnnotation = null) {
  return (0, _validateNode.default)({
    type: "TSCallSignatureDeclaration",
    typeParameters,
    parameters,
    typeAnnotation
  });
}
function tsConstructSignatureDeclaration(typeParameters = null, parameters, typeAnnotation = null) {
  return (0, _validateNode.default)({
    type: "TSConstructSignatureDeclaration",
    typeParameters,
    parameters,
    typeAnnotation
  });
}
function tsPropertySignature(key, typeAnnotation = null, initializer = null) {
  return (0, _validateNode.default)({
    type: "TSPropertySignature",
    key,
    typeAnnotation,
    initializer,
    kind: null
  });
}
function tsMethodSignature(key, typeParameters = null, parameters, typeAnnotation = null) {
  return (0, _validateNode.default)({
    type: "TSMethodSignature",
    key,
    typeParameters,
    parameters,
    typeAnnotation,
    kind: null
  });
}
function tsIndexSignature(parameters, typeAnnotation = null) {
  return (0, _validateNode.default)({
    type: "TSIndexSignature",
    parameters,
    typeAnnotation
  });
}
function tsAnyKeyword() {
  return {
    type: "TSAnyKeyword"
  };
}
function tsBooleanKeyword() {
  return {
    type: "TSBooleanKeyword"
  };
}
function tsBigIntKeyword() {
  return {
    type: "TSBigIntKeyword"
  };
}
function tsIntrinsicKeyword() {
  return {
    type: "TSIntrinsicKeyword"
  };
}
function tsNeverKeyword() {
  return {
    type: "TSNeverKeyword"
  };
}
function tsNullKeyword() {
  return {
    type: "TSNullKeyword"
  };
}
function tsNumberKeyword() {
  return {
    type: "TSNumberKeyword"
  };
}
function tsObjectKeyword() {
  return {
    type: "TSObjectKeyword"
  };
}
function tsStringKeyword() {
  return {
    type: "TSStringKeyword"
  };
}
function tsSymbolKeyword() {
  return {
    type: "TSSymbolKeyword"
  };
}
function tsUndefinedKeyword() {
  return {
    type: "TSUndefinedKeyword"
  };
}
function tsUnknownKeyword() {
  return {
    type: "TSUnknownKeyword"
  };
}
function tsVoidKeyword() {
  return {
    type: "TSVoidKeyword"
  };
}
function tsThisType() {
  return {
    type: "TSThisType"
  };
}
function tsFunctionType(typeParameters = null, parameters, typeAnnotation = null) {
  return (0, _validateNode.default)({
    type: "TSFunctionType",
    typeParameters,
    parameters,
    typeAnnotation
  });
}
function tsConstructorType(typeParameters = null, parameters, typeAnnotation = null) {
  return (0, _validateNode.default)({
    type: "TSConstructorType",
    typeParameters,
    parameters,
    typeAnnotation
  });
}
function tsTypeReference(typeName, typeParameters = null) {
  return (0, _validateNode.default)({
    type: "TSTypeReference",
    typeName,
    typeParameters
  });
}
function tsTypePredicate(parameterName, typeAnnotation = null, asserts = null) {
  return (0, _validateNode.default)({
    type: "TSTypePredicate",
    parameterName,
    typeAnnotation,
    asserts
  });
}
function tsTypeQuery(exprName, typeParameters = null) {
  return (0, _validateNode.default)({
    type: "TSTypeQuery",
    exprName,
    typeParameters
  });
}
function tsTypeLiteral(members) {
  return (0, _validateNode.default)({
    type: "TSTypeLiteral",
    members
  });
}
function tsArrayType(elementType) {
  return (0, _validateNode.default)({
    type: "TSArrayType",
    elementType
  });
}
function tsTupleType(elementTypes) {
  return (0, _validateNode.default)({
    type: "TSTupleType",
    elementTypes
  });
}
function tsOptionalType(typeAnnotation) {
  return (0, _validateNode.default)({
    type: "TSOptionalType",
    typeAnnotation
  });
}
function tsRestType(typeAnnotation) {
  return (0, _validateNode.default)({
    type: "TSRestType",
    typeAnnotation
  });
}
function tsNamedTupleMember(label, elementType, optional = false) {
  return (0, _validateNode.default)({
    type: "TSNamedTupleMember",
    label,
    elementType,
    optional
  });
}
function tsUnionType(types) {
  return (0, _validateNode.default)({
    type: "TSUnionType",
    types
  });
}
function tsIntersectionType(types) {
  return (0, _validateNode.default)({
    type: "TSIntersectionType",
    types
  });
}
function tsConditionalType(checkType, extendsType, trueType, falseType) {
  return (0, _validateNode.default)({
    type: "TSConditionalType",
    checkType,
    extendsType,
    trueType,
    falseType
  });
}
function tsInferType(typeParameter) {
  return (0, _validateNode.default)({
    type: "TSInferType",
    typeParameter
  });
}
function tsParenthesizedType(typeAnnotation) {
  return (0, _validateNode.default)({
    type: "TSParenthesizedType",
    typeAnnotation
  });
}
function tsTypeOperator(typeAnnotation) {
  return (0, _validateNode.default)({
    type: "TSTypeOperator",
    typeAnnotation,
    operator: null
  });
}
function tsIndexedAccessType(objectType, indexType) {
  return (0, _validateNode.default)({
    type: "TSIndexedAccessType",
    objectType,
    indexType
  });
}
function tsMappedType(typeParameter, typeAnnotation = null, nameType = null) {
  return (0, _validateNode.default)({
    type: "TSMappedType",
    typeParameter,
    typeAnnotation,
    nameType
  });
}
function tsLiteralType(literal) {
  return (0, _validateNode.default)({
    type: "TSLiteralType",
    literal
  });
}
function tsExpressionWithTypeArguments(expression, typeParameters = null) {
  return (0, _validateNode.default)({
    type: "TSExpressionWithTypeArguments",
    expression,
    typeParameters
  });
}
function tsInterfaceDeclaration(id, typeParameters = null, _extends = null, body) {
  return (0, _validateNode.default)({
    type: "TSInterfaceDeclaration",
    id,
    typeParameters,
    extends: _extends,
    body
  });
}
function tsInterfaceBody(body) {
  return (0, _validateNode.default)({
    type: "TSInterfaceBody",
    body
  });
}
function tsTypeAliasDeclaration(id, typeParameters = null, typeAnnotation) {
  return (0, _validateNode.default)({
    type: "TSTypeAliasDeclaration",
    id,
    typeParameters,
    typeAnnotation
  });
}
function tsInstantiationExpression(expression, typeParameters = null) {
  return (0, _validateNode.default)({
    type: "TSInstantiationExpression",
    expression,
    typeParameters
  });
}
function tsAsExpression(expression, typeAnnotation) {
  return (0, _validateNode.default)({
    type: "TSAsExpression",
    expression,
    typeAnnotation
  });
}
function tsSatisfiesExpression(expression, typeAnnotation) {
  return (0, _validateNode.default)({
    type: "TSSatisfiesExpression",
    expression,
    typeAnnotation
  });
}
function tsTypeAssertion(typeAnnotation, expression) {
  return (0, _validateNode.default)({
    type: "TSTypeAssertion",
    typeAnnotation,
    expression
  });
}
function tsEnumDeclaration(id, members) {
  return (0, _validateNode.default)({
    type: "TSEnumDeclaration",
    id,
    members
  });
}
function tsEnumMember(id, initializer = null) {
  return (0, _validateNode.default)({
    type: "TSEnumMember",
    id,
    initializer
  });
}
function tsModuleDeclaration(id, body) {
  return (0, _validateNode.default)({
    type: "TSModuleDeclaration",
    id,
    body
  });
}
function tsModuleBlock(body) {
  return (0, _validateNode.default)({
    type: "TSModuleBlock",
    body
  });
}
function tsImportType(argument, qualifier = null, typeParameters = null) {
  return (0, _validateNode.default)({
    type: "TSImportType",
    argument,
    qualifier,
    typeParameters
  });
}
function tsImportEqualsDeclaration(id, moduleReference) {
  return (0, _validateNode.default)({
    type: "TSImportEqualsDeclaration",
    id,
    moduleReference,
    isExport: null
  });
}
function tsExternalModuleReference(expression) {
  return (0, _validateNode.default)({
    type: "TSExternalModuleReference",
    expression
  });
}
function tsNonNullExpression(expression) {
  return (0, _validateNode.default)({
    type: "TSNonNullExpression",
    expression
  });
}
function tsExportAssignment(expression) {
  return (0, _validateNode.default)({
    type: "TSExportAssignment",
    expression
  });
}
function tsNamespaceExportDeclaration(id) {
  return (0, _validateNode.default)({
    type: "TSNamespaceExportDeclaration",
    id
  });
}
function tsTypeAnnotation(typeAnnotation) {
  return (0, _validateNode.default)({
    type: "TSTypeAnnotation",
    typeAnnotation
  });
}
function tsTypeParameterInstantiation(params) {
  return (0, _validateNode.default)({
    type: "TSTypeParameterInstantiation",
    params
  });
}
function tsTypeParameterDeclaration(params) {
  return (0, _validateNode.default)({
    type: "TSTypeParameterDeclaration",
    params
  });
}
function tsTypeParameter(constraint = null, _default = null, name) {
  return (0, _validateNode.default)({
    type: "TSTypeParameter",
    constraint,
    default: _default,
    name
  });
}
function NumberLiteral(value) {
  (0, _deprecationWarning.default)("NumberLiteral", "NumericLiteral", "The node type ");
  return numericLiteral(value);
}
function RegexLiteral(pattern, flags = "") {
  (0, _deprecationWarning.default)("RegexLiteral", "RegExpLiteral", "The node type ");
  return regExpLiteral(pattern, flags);
}
function RestProperty(argument) {
  (0, _deprecationWarning.default)("RestProperty", "RestElement", "The node type ");
  return restElement(argument);
}
function SpreadProperty(argument) {
  (0, _deprecationWarning.default)("SpreadProperty", "SpreadElement", "The node type ");
  return spreadElement(argument);
}



},{"../../utils/deprecationWarning.js":81,"../validateNode.js":33}],29:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "AnyTypeAnnotation", {
  enumerable: true,
  get: function () {
    return _index.anyTypeAnnotation;
  }
});
Object.defineProperty(exports, "ArgumentPlaceholder", {
  enumerable: true,
  get: function () {
    return _index.argumentPlaceholder;
  }
});
Object.defineProperty(exports, "ArrayExpression", {
  enumerable: true,
  get: function () {
    return _index.arrayExpression;
  }
});
Object.defineProperty(exports, "ArrayPattern", {
  enumerable: true,
  get: function () {
    return _index.arrayPattern;
  }
});
Object.defineProperty(exports, "ArrayTypeAnnotation", {
  enumerable: true,
  get: function () {
    return _index.arrayTypeAnnotation;
  }
});
Object.defineProperty(exports, "ArrowFunctionExpression", {
  enumerable: true,
  get: function () {
    return _index.arrowFunctionExpression;
  }
});
Object.defineProperty(exports, "AssignmentExpression", {
  enumerable: true,
  get: function () {
    return _index.assignmentExpression;
  }
});
Object.defineProperty(exports, "AssignmentPattern", {
  enumerable: true,
  get: function () {
    return _index.assignmentPattern;
  }
});
Object.defineProperty(exports, "AwaitExpression", {
  enumerable: true,
  get: function () {
    return _index.awaitExpression;
  }
});
Object.defineProperty(exports, "BigIntLiteral", {
  enumerable: true,
  get: function () {
    return _index.bigIntLiteral;
  }
});
Object.defineProperty(exports, "BinaryExpression", {
  enumerable: true,
  get: function () {
    return _index.binaryExpression;
  }
});
Object.defineProperty(exports, "BindExpression", {
  enumerable: true,
  get: function () {
    return _index.bindExpression;
  }
});
Object.defineProperty(exports, "BlockStatement", {
  enumerable: true,
  get: function () {
    return _index.blockStatement;
  }
});
Object.defineProperty(exports, "BooleanLiteral", {
  enumerable: true,
  get: function () {
    return _index.booleanLiteral;
  }
});
Object.defineProperty(exports, "BooleanLiteralTypeAnnotation", {
  enumerable: true,
  get: function () {
    return _index.booleanLiteralTypeAnnotation;
  }
});
Object.defineProperty(exports, "BooleanTypeAnnotation", {
  enumerable: true,
  get: function () {
    return _index.booleanTypeAnnotation;
  }
});
Object.defineProperty(exports, "BreakStatement", {
  enumerable: true,
  get: function () {
    return _index.breakStatement;
  }
});
Object.defineProperty(exports, "CallExpression", {
  enumerable: true,
  get: function () {
    return _index.callExpression;
  }
});
Object.defineProperty(exports, "CatchClause", {
  enumerable: true,
  get: function () {
    return _index.catchClause;
  }
});
Object.defineProperty(exports, "ClassAccessorProperty", {
  enumerable: true,
  get: function () {
    return _index.classAccessorProperty;
  }
});
Object.defineProperty(exports, "ClassBody", {
  enumerable: true,
  get: function () {
    return _index.classBody;
  }
});
Object.defineProperty(exports, "ClassDeclaration", {
  enumerable: true,
  get: function () {
    return _index.classDeclaration;
  }
});
Object.defineProperty(exports, "ClassExpression", {
  enumerable: true,
  get: function () {
    return _index.classExpression;
  }
});
Object.defineProperty(exports, "ClassImplements", {
  enumerable: true,
  get: function () {
    return _index.classImplements;
  }
});
Object.defineProperty(exports, "ClassMethod", {
  enumerable: true,
  get: function () {
    return _index.classMethod;
  }
});
Object.defineProperty(exports, "ClassPrivateMethod", {
  enumerable: true,
  get: function () {
    return _index.classPrivateMethod;
  }
});
Object.defineProperty(exports, "ClassPrivateProperty", {
  enumerable: true,
  get: function () {
    return _index.classPrivateProperty;
  }
});
Object.defineProperty(exports, "ClassProperty", {
  enumerable: true,
  get: function () {
    return _index.classProperty;
  }
});
Object.defineProperty(exports, "ConditionalExpression", {
  enumerable: true,
  get: function () {
    return _index.conditionalExpression;
  }
});
Object.defineProperty(exports, "ContinueStatement", {
  enumerable: true,
  get: function () {
    return _index.continueStatement;
  }
});
Object.defineProperty(exports, "DebuggerStatement", {
  enumerable: true,
  get: function () {
    return _index.debuggerStatement;
  }
});
Object.defineProperty(exports, "DecimalLiteral", {
  enumerable: true,
  get: function () {
    return _index.decimalLiteral;
  }
});
Object.defineProperty(exports, "DeclareClass", {
  enumerable: true,
  get: function () {
    return _index.declareClass;
  }
});
Object.defineProperty(exports, "DeclareExportAllDeclaration", {
  enumerable: true,
  get: function () {
    return _index.declareExportAllDeclaration;
  }
});
Object.defineProperty(exports, "DeclareExportDeclaration", {
  enumerable: true,
  get: function () {
    return _index.declareExportDeclaration;
  }
});
Object.defineProperty(exports, "DeclareFunction", {
  enumerable: true,
  get: function () {
    return _index.declareFunction;
  }
});
Object.defineProperty(exports, "DeclareInterface", {
  enumerable: true,
  get: function () {
    return _index.declareInterface;
  }
});
Object.defineProperty(exports, "DeclareModule", {
  enumerable: true,
  get: function () {
    return _index.declareModule;
  }
});
Object.defineProperty(exports, "DeclareModuleExports", {
  enumerable: true,
  get: function () {
    return _index.declareModuleExports;
  }
});
Object.defineProperty(exports, "DeclareOpaqueType", {
  enumerable: true,
  get: function () {
    return _index.declareOpaqueType;
  }
});
Object.defineProperty(exports, "DeclareTypeAlias", {
  enumerable: true,
  get: function () {
    return _index.declareTypeAlias;
  }
});
Object.defineProperty(exports, "DeclareVariable", {
  enumerable: true,
  get: function () {
    return _index.declareVariable;
  }
});
Object.defineProperty(exports, "DeclaredPredicate", {
  enumerable: true,
  get: function () {
    return _index.declaredPredicate;
  }
});
Object.defineProperty(exports, "Decorator", {
  enumerable: true,
  get: function () {
    return _index.decorator;
  }
});
Object.defineProperty(exports, "Directive", {
  enumerable: true,
  get: function () {
    return _index.directive;
  }
});
Object.defineProperty(exports, "DirectiveLiteral", {
  enumerable: true,
  get: function () {
    return _index.directiveLiteral;
  }
});
Object.defineProperty(exports, "DoExpression", {
  enumerable: true,
  get: function () {
    return _index.doExpression;
  }
});
Object.defineProperty(exports, "DoWhileStatement", {
  enumerable: true,
  get: function () {
    return _index.doWhileStatement;
  }
});
Object.defineProperty(exports, "EmptyStatement", {
  enumerable: true,
  get: function () {
    return _index.emptyStatement;
  }
});
Object.defineProperty(exports, "EmptyTypeAnnotation", {
  enumerable: true,
  get: function () {
    return _index.emptyTypeAnnotation;
  }
});
Object.defineProperty(exports, "EnumBooleanBody", {
  enumerable: true,
  get: function () {
    return _index.enumBooleanBody;
  }
});
Object.defineProperty(exports, "EnumBooleanMember", {
  enumerable: true,
  get: function () {
    return _index.enumBooleanMember;
  }
});
Object.defineProperty(exports, "EnumDeclaration", {
  enumerable: true,
  get: function () {
    return _index.enumDeclaration;
  }
});
Object.defineProperty(exports, "EnumDefaultedMember", {
  enumerable: true,
  get: function () {
    return _index.enumDefaultedMember;
  }
});
Object.defineProperty(exports, "EnumNumberBody", {
  enumerable: true,
  get: function () {
    return _index.enumNumberBody;
  }
});
Object.defineProperty(exports, "EnumNumberMember", {
  enumerable: true,
  get: function () {
    return _index.enumNumberMember;
  }
});
Object.defineProperty(exports, "EnumStringBody", {
  enumerable: true,
  get: function () {
    return _index.enumStringBody;
  }
});
Object.defineProperty(exports, "EnumStringMember", {
  enumerable: true,
  get: function () {
    return _index.enumStringMember;
  }
});
Object.defineProperty(exports, "EnumSymbolBody", {
  enumerable: true,
  get: function () {
    return _index.enumSymbolBody;
  }
});
Object.defineProperty(exports, "ExistsTypeAnnotation", {
  enumerable: true,
  get: function () {
    return _index.existsTypeAnnotation;
  }
});
Object.defineProperty(exports, "ExportAllDeclaration", {
  enumerable: true,
  get: function () {
    return _index.exportAllDeclaration;
  }
});
Object.defineProperty(exports, "ExportDefaultDeclaration", {
  enumerable: true,
  get: function () {
    return _index.exportDefaultDeclaration;
  }
});
Object.defineProperty(exports, "ExportDefaultSpecifier", {
  enumerable: true,
  get: function () {
    return _index.exportDefaultSpecifier;
  }
});
Object.defineProperty(exports, "ExportNamedDeclaration", {
  enumerable: true,
  get: function () {
    return _index.exportNamedDeclaration;
  }
});
Object.defineProperty(exports, "ExportNamespaceSpecifier", {
  enumerable: true,
  get: function () {
    return _index.exportNamespaceSpecifier;
  }
});
Object.defineProperty(exports, "ExportSpecifier", {
  enumerable: true,
  get: function () {
    return _index.exportSpecifier;
  }
});
Object.defineProperty(exports, "ExpressionStatement", {
  enumerable: true,
  get: function () {
    return _index.expressionStatement;
  }
});
Object.defineProperty(exports, "File", {
  enumerable: true,
  get: function () {
    return _index.file;
  }
});
Object.defineProperty(exports, "ForInStatement", {
  enumerable: true,
  get: function () {
    return _index.forInStatement;
  }
});
Object.defineProperty(exports, "ForOfStatement", {
  enumerable: true,
  get: function () {
    return _index.forOfStatement;
  }
});
Object.defineProperty(exports, "ForStatement", {
  enumerable: true,
  get: function () {
    return _index.forStatement;
  }
});
Object.defineProperty(exports, "FunctionDeclaration", {
  enumerable: true,
  get: function () {
    return _index.functionDeclaration;
  }
});
Object.defineProperty(exports, "FunctionExpression", {
  enumerable: true,
  get: function () {
    return _index.functionExpression;
  }
});
Object.defineProperty(exports, "FunctionTypeAnnotation", {
  enumerable: true,
  get: function () {
    return _index.functionTypeAnnotation;
  }
});
Object.defineProperty(exports, "FunctionTypeParam", {
  enumerable: true,
  get: function () {
    return _index.functionTypeParam;
  }
});
Object.defineProperty(exports, "GenericTypeAnnotation", {
  enumerable: true,
  get: function () {
    return _index.genericTypeAnnotation;
  }
});
Object.defineProperty(exports, "Identifier", {
  enumerable: true,
  get: function () {
    return _index.identifier;
  }
});
Object.defineProperty(exports, "IfStatement", {
  enumerable: true,
  get: function () {
    return _index.ifStatement;
  }
});
Object.defineProperty(exports, "Import", {
  enumerable: true,
  get: function () {
    return _index.import;
  }
});
Object.defineProperty(exports, "ImportAttribute", {
  enumerable: true,
  get: function () {
    return _index.importAttribute;
  }
});
Object.defineProperty(exports, "ImportDeclaration", {
  enumerable: true,
  get: function () {
    return _index.importDeclaration;
  }
});
Object.defineProperty(exports, "ImportDefaultSpecifier", {
  enumerable: true,
  get: function () {
    return _index.importDefaultSpecifier;
  }
});
Object.defineProperty(exports, "ImportExpression", {
  enumerable: true,
  get: function () {
    return _index.importExpression;
  }
});
Object.defineProperty(exports, "ImportNamespaceSpecifier", {
  enumerable: true,
  get: function () {
    return _index.importNamespaceSpecifier;
  }
});
Object.defineProperty(exports, "ImportSpecifier", {
  enumerable: true,
  get: function () {
    return _index.importSpecifier;
  }
});
Object.defineProperty(exports, "IndexedAccessType", {
  enumerable: true,
  get: function () {
    return _index.indexedAccessType;
  }
});
Object.defineProperty(exports, "InferredPredicate", {
  enumerable: true,
  get: function () {
    return _index.inferredPredicate;
  }
});
Object.defineProperty(exports, "InterfaceDeclaration", {
  enumerable: true,
  get: function () {
    return _index.interfaceDeclaration;
  }
});
Object.defineProperty(exports, "InterfaceExtends", {
  enumerable: true,
  get: function () {
    return _index.interfaceExtends;
  }
});
Object.defineProperty(exports, "InterfaceTypeAnnotation", {
  enumerable: true,
  get: function () {
    return _index.interfaceTypeAnnotation;
  }
});
Object.defineProperty(exports, "InterpreterDirective", {
  enumerable: true,
  get: function () {
    return _index.interpreterDirective;
  }
});
Object.defineProperty(exports, "IntersectionTypeAnnotation", {
  enumerable: true,
  get: function () {
    return _index.intersectionTypeAnnotation;
  }
});
Object.defineProperty(exports, "JSXAttribute", {
  enumerable: true,
  get: function () {
    return _index.jsxAttribute;
  }
});
Object.defineProperty(exports, "JSXClosingElement", {
  enumerable: true,
  get: function () {
    return _index.jsxClosingElement;
  }
});
Object.defineProperty(exports, "JSXClosingFragment", {
  enumerable: true,
  get: function () {
    return _index.jsxClosingFragment;
  }
});
Object.defineProperty(exports, "JSXElement", {
  enumerable: true,
  get: function () {
    return _index.jsxElement;
  }
});
Object.defineProperty(exports, "JSXEmptyExpression", {
  enumerable: true,
  get: function () {
    return _index.jsxEmptyExpression;
  }
});
Object.defineProperty(exports, "JSXExpressionContainer", {
  enumerable: true,
  get: function () {
    return _index.jsxExpressionContainer;
  }
});
Object.defineProperty(exports, "JSXFragment", {
  enumerable: true,
  get: function () {
    return _index.jsxFragment;
  }
});
Object.defineProperty(exports, "JSXIdentifier", {
  enumerable: true,
  get: function () {
    return _index.jsxIdentifier;
  }
});
Object.defineProperty(exports, "JSXMemberExpression", {
  enumerable: true,
  get: function () {
    return _index.jsxMemberExpression;
  }
});
Object.defineProperty(exports, "JSXNamespacedName", {
  enumerable: true,
  get: function () {
    return _index.jsxNamespacedName;
  }
});
Object.defineProperty(exports, "JSXOpeningElement", {
  enumerable: true,
  get: function () {
    return _index.jsxOpeningElement;
  }
});
Object.defineProperty(exports, "JSXOpeningFragment", {
  enumerable: true,
  get: function () {
    return _index.jsxOpeningFragment;
  }
});
Object.defineProperty(exports, "JSXSpreadAttribute", {
  enumerable: true,
  get: function () {
    return _index.jsxSpreadAttribute;
  }
});
Object.defineProperty(exports, "JSXSpreadChild", {
  enumerable: true,
  get: function () {
    return _index.jsxSpreadChild;
  }
});
Object.defineProperty(exports, "JSXText", {
  enumerable: true,
  get: function () {
    return _index.jsxText;
  }
});
Object.defineProperty(exports, "LabeledStatement", {
  enumerable: true,
  get: function () {
    return _index.labeledStatement;
  }
});
Object.defineProperty(exports, "LogicalExpression", {
  enumerable: true,
  get: function () {
    return _index.logicalExpression;
  }
});
Object.defineProperty(exports, "MemberExpression", {
  enumerable: true,
  get: function () {
    return _index.memberExpression;
  }
});
Object.defineProperty(exports, "MetaProperty", {
  enumerable: true,
  get: function () {
    return _index.metaProperty;
  }
});
Object.defineProperty(exports, "MixedTypeAnnotation", {
  enumerable: true,
  get: function () {
    return _index.mixedTypeAnnotation;
  }
});
Object.defineProperty(exports, "ModuleExpression", {
  enumerable: true,
  get: function () {
    return _index.moduleExpression;
  }
});
Object.defineProperty(exports, "NewExpression", {
  enumerable: true,
  get: function () {
    return _index.newExpression;
  }
});
Object.defineProperty(exports, "Noop", {
  enumerable: true,
  get: function () {
    return _index.noop;
  }
});
Object.defineProperty(exports, "NullLiteral", {
  enumerable: true,
  get: function () {
    return _index.nullLiteral;
  }
});
Object.defineProperty(exports, "NullLiteralTypeAnnotation", {
  enumerable: true,
  get: function () {
    return _index.nullLiteralTypeAnnotation;
  }
});
Object.defineProperty(exports, "NullableTypeAnnotation", {
  enumerable: true,
  get: function () {
    return _index.nullableTypeAnnotation;
  }
});
Object.defineProperty(exports, "NumberLiteral", {
  enumerable: true,
  get: function () {
    return _index.numberLiteral;
  }
});
Object.defineProperty(exports, "NumberLiteralTypeAnnotation", {
  enumerable: true,
  get: function () {
    return _index.numberLiteralTypeAnnotation;
  }
});
Object.defineProperty(exports, "NumberTypeAnnotation", {
  enumerable: true,
  get: function () {
    return _index.numberTypeAnnotation;
  }
});
Object.defineProperty(exports, "NumericLiteral", {
  enumerable: true,
  get: function () {
    return _index.numericLiteral;
  }
});
Object.defineProperty(exports, "ObjectExpression", {
  enumerable: true,
  get: function () {
    return _index.objectExpression;
  }
});
Object.defineProperty(exports, "ObjectMethod", {
  enumerable: true,
  get: function () {
    return _index.objectMethod;
  }
});
Object.defineProperty(exports, "ObjectPattern", {
  enumerable: true,
  get: function () {
    return _index.objectPattern;
  }
});
Object.defineProperty(exports, "ObjectProperty", {
  enumerable: true,
  get: function () {
    return _index.objectProperty;
  }
});
Object.defineProperty(exports, "ObjectTypeAnnotation", {
  enumerable: true,
  get: function () {
    return _index.objectTypeAnnotation;
  }
});
Object.defineProperty(exports, "ObjectTypeCallProperty", {
  enumerable: true,
  get: function () {
    return _index.objectTypeCallProperty;
  }
});
Object.defineProperty(exports, "ObjectTypeIndexer", {
  enumerable: true,
  get: function () {
    return _index.objectTypeIndexer;
  }
});
Object.defineProperty(exports, "ObjectTypeInternalSlot", {
  enumerable: true,
  get: function () {
    return _index.objectTypeInternalSlot;
  }
});
Object.defineProperty(exports, "ObjectTypeProperty", {
  enumerable: true,
  get: function () {
    return _index.objectTypeProperty;
  }
});
Object.defineProperty(exports, "ObjectTypeSpreadProperty", {
  enumerable: true,
  get: function () {
    return _index.objectTypeSpreadProperty;
  }
});
Object.defineProperty(exports, "OpaqueType", {
  enumerable: true,
  get: function () {
    return _index.opaqueType;
  }
});
Object.defineProperty(exports, "OptionalCallExpression", {
  enumerable: true,
  get: function () {
    return _index.optionalCallExpression;
  }
});
Object.defineProperty(exports, "OptionalIndexedAccessType", {
  enumerable: true,
  get: function () {
    return _index.optionalIndexedAccessType;
  }
});
Object.defineProperty(exports, "OptionalMemberExpression", {
  enumerable: true,
  get: function () {
    return _index.optionalMemberExpression;
  }
});
Object.defineProperty(exports, "ParenthesizedExpression", {
  enumerable: true,
  get: function () {
    return _index.parenthesizedExpression;
  }
});
Object.defineProperty(exports, "PipelineBareFunction", {
  enumerable: true,
  get: function () {
    return _index.pipelineBareFunction;
  }
});
Object.defineProperty(exports, "PipelinePrimaryTopicReference", {
  enumerable: true,
  get: function () {
    return _index.pipelinePrimaryTopicReference;
  }
});
Object.defineProperty(exports, "PipelineTopicExpression", {
  enumerable: true,
  get: function () {
    return _index.pipelineTopicExpression;
  }
});
Object.defineProperty(exports, "Placeholder", {
  enumerable: true,
  get: function () {
    return _index.placeholder;
  }
});
Object.defineProperty(exports, "PrivateName", {
  enumerable: true,
  get: function () {
    return _index.privateName;
  }
});
Object.defineProperty(exports, "Program", {
  enumerable: true,
  get: function () {
    return _index.program;
  }
});
Object.defineProperty(exports, "QualifiedTypeIdentifier", {
  enumerable: true,
  get: function () {
    return _index.qualifiedTypeIdentifier;
  }
});
Object.defineProperty(exports, "RecordExpression", {
  enumerable: true,
  get: function () {
    return _index.recordExpression;
  }
});
Object.defineProperty(exports, "RegExpLiteral", {
  enumerable: true,
  get: function () {
    return _index.regExpLiteral;
  }
});
Object.defineProperty(exports, "RegexLiteral", {
  enumerable: true,
  get: function () {
    return _index.regexLiteral;
  }
});
Object.defineProperty(exports, "RestElement", {
  enumerable: true,
  get: function () {
    return _index.restElement;
  }
});
Object.defineProperty(exports, "RestProperty", {
  enumerable: true,
  get: function () {
    return _index.restProperty;
  }
});
Object.defineProperty(exports, "ReturnStatement", {
  enumerable: true,
  get: function () {
    return _index.returnStatement;
  }
});
Object.defineProperty(exports, "SequenceExpression", {
  enumerable: true,
  get: function () {
    return _index.sequenceExpression;
  }
});
Object.defineProperty(exports, "SpreadElement", {
  enumerable: true,
  get: function () {
    return _index.spreadElement;
  }
});
Object.defineProperty(exports, "SpreadProperty", {
  enumerable: true,
  get: function () {
    return _index.spreadProperty;
  }
});
Object.defineProperty(exports, "StaticBlock", {
  enumerable: true,
  get: function () {
    return _index.staticBlock;
  }
});
Object.defineProperty(exports, "StringLiteral", {
  enumerable: true,
  get: function () {
    return _index.stringLiteral;
  }
});
Object.defineProperty(exports, "StringLiteralTypeAnnotation", {
  enumerable: true,
  get: function () {
    return _index.stringLiteralTypeAnnotation;
  }
});
Object.defineProperty(exports, "StringTypeAnnotation", {
  enumerable: true,
  get: function () {
    return _index.stringTypeAnnotation;
  }
});
Object.defineProperty(exports, "Super", {
  enumerable: true,
  get: function () {
    return _index.super;
  }
});
Object.defineProperty(exports, "SwitchCase", {
  enumerable: true,
  get: function () {
    return _index.switchCase;
  }
});
Object.defineProperty(exports, "SwitchStatement", {
  enumerable: true,
  get: function () {
    return _index.switchStatement;
  }
});
Object.defineProperty(exports, "SymbolTypeAnnotation", {
  enumerable: true,
  get: function () {
    return _index.symbolTypeAnnotation;
  }
});
Object.defineProperty(exports, "TSAnyKeyword", {
  enumerable: true,
  get: function () {
    return _index.tsAnyKeyword;
  }
});
Object.defineProperty(exports, "TSArrayType", {
  enumerable: true,
  get: function () {
    return _index.tsArrayType;
  }
});
Object.defineProperty(exports, "TSAsExpression", {
  enumerable: true,
  get: function () {
    return _index.tsAsExpression;
  }
});
Object.defineProperty(exports, "TSBigIntKeyword", {
  enumerable: true,
  get: function () {
    return _index.tsBigIntKeyword;
  }
});
Object.defineProperty(exports, "TSBooleanKeyword", {
  enumerable: true,
  get: function () {
    return _index.tsBooleanKeyword;
  }
});
Object.defineProperty(exports, "TSCallSignatureDeclaration", {
  enumerable: true,
  get: function () {
    return _index.tsCallSignatureDeclaration;
  }
});
Object.defineProperty(exports, "TSConditionalType", {
  enumerable: true,
  get: function () {
    return _index.tsConditionalType;
  }
});
Object.defineProperty(exports, "TSConstructSignatureDeclaration", {
  enumerable: true,
  get: function () {
    return _index.tsConstructSignatureDeclaration;
  }
});
Object.defineProperty(exports, "TSConstructorType", {
  enumerable: true,
  get: function () {
    return _index.tsConstructorType;
  }
});
Object.defineProperty(exports, "TSDeclareFunction", {
  enumerable: true,
  get: function () {
    return _index.tsDeclareFunction;
  }
});
Object.defineProperty(exports, "TSDeclareMethod", {
  enumerable: true,
  get: function () {
    return _index.tsDeclareMethod;
  }
});
Object.defineProperty(exports, "TSEnumDeclaration", {
  enumerable: true,
  get: function () {
    return _index.tsEnumDeclaration;
  }
});
Object.defineProperty(exports, "TSEnumMember", {
  enumerable: true,
  get: function () {
    return _index.tsEnumMember;
  }
});
Object.defineProperty(exports, "TSExportAssignment", {
  enumerable: true,
  get: function () {
    return _index.tsExportAssignment;
  }
});
Object.defineProperty(exports, "TSExpressionWithTypeArguments", {
  enumerable: true,
  get: function () {
    return _index.tsExpressionWithTypeArguments;
  }
});
Object.defineProperty(exports, "TSExternalModuleReference", {
  enumerable: true,
  get: function () {
    return _index.tsExternalModuleReference;
  }
});
Object.defineProperty(exports, "TSFunctionType", {
  enumerable: true,
  get: function () {
    return _index.tsFunctionType;
  }
});
Object.defineProperty(exports, "TSImportEqualsDeclaration", {
  enumerable: true,
  get: function () {
    return _index.tsImportEqualsDeclaration;
  }
});
Object.defineProperty(exports, "TSImportType", {
  enumerable: true,
  get: function () {
    return _index.tsImportType;
  }
});
Object.defineProperty(exports, "TSIndexSignature", {
  enumerable: true,
  get: function () {
    return _index.tsIndexSignature;
  }
});
Object.defineProperty(exports, "TSIndexedAccessType", {
  enumerable: true,
  get: function () {
    return _index.tsIndexedAccessType;
  }
});
Object.defineProperty(exports, "TSInferType", {
  enumerable: true,
  get: function () {
    return _index.tsInferType;
  }
});
Object.defineProperty(exports, "TSInstantiationExpression", {
  enumerable: true,
  get: function () {
    return _index.tsInstantiationExpression;
  }
});
Object.defineProperty(exports, "TSInterfaceBody", {
  enumerable: true,
  get: function () {
    return _index.tsInterfaceBody;
  }
});
Object.defineProperty(exports, "TSInterfaceDeclaration", {
  enumerable: true,
  get: function () {
    return _index.tsInterfaceDeclaration;
  }
});
Object.defineProperty(exports, "TSIntersectionType", {
  enumerable: true,
  get: function () {
    return _index.tsIntersectionType;
  }
});
Object.defineProperty(exports, "TSIntrinsicKeyword", {
  enumerable: true,
  get: function () {
    return _index.tsIntrinsicKeyword;
  }
});
Object.defineProperty(exports, "TSLiteralType", {
  enumerable: true,
  get: function () {
    return _index.tsLiteralType;
  }
});
Object.defineProperty(exports, "TSMappedType", {
  enumerable: true,
  get: function () {
    return _index.tsMappedType;
  }
});
Object.defineProperty(exports, "TSMethodSignature", {
  enumerable: true,
  get: function () {
    return _index.tsMethodSignature;
  }
});
Object.defineProperty(exports, "TSModuleBlock", {
  enumerable: true,
  get: function () {
    return _index.tsModuleBlock;
  }
});
Object.defineProperty(exports, "TSModuleDeclaration", {
  enumerable: true,
  get: function () {
    return _index.tsModuleDeclaration;
  }
});
Object.defineProperty(exports, "TSNamedTupleMember", {
  enumerable: true,
  get: function () {
    return _index.tsNamedTupleMember;
  }
});
Object.defineProperty(exports, "TSNamespaceExportDeclaration", {
  enumerable: true,
  get: function () {
    return _index.tsNamespaceExportDeclaration;
  }
});
Object.defineProperty(exports, "TSNeverKeyword", {
  enumerable: true,
  get: function () {
    return _index.tsNeverKeyword;
  }
});
Object.defineProperty(exports, "TSNonNullExpression", {
  enumerable: true,
  get: function () {
    return _index.tsNonNullExpression;
  }
});
Object.defineProperty(exports, "TSNullKeyword", {
  enumerable: true,
  get: function () {
    return _index.tsNullKeyword;
  }
});
Object.defineProperty(exports, "TSNumberKeyword", {
  enumerable: true,
  get: function () {
    return _index.tsNumberKeyword;
  }
});
Object.defineProperty(exports, "TSObjectKeyword", {
  enumerable: true,
  get: function () {
    return _index.tsObjectKeyword;
  }
});
Object.defineProperty(exports, "TSOptionalType", {
  enumerable: true,
  get: function () {
    return _index.tsOptionalType;
  }
});
Object.defineProperty(exports, "TSParameterProperty", {
  enumerable: true,
  get: function () {
    return _index.tsParameterProperty;
  }
});
Object.defineProperty(exports, "TSParenthesizedType", {
  enumerable: true,
  get: function () {
    return _index.tsParenthesizedType;
  }
});
Object.defineProperty(exports, "TSPropertySignature", {
  enumerable: true,
  get: function () {
    return _index.tsPropertySignature;
  }
});
Object.defineProperty(exports, "TSQualifiedName", {
  enumerable: true,
  get: function () {
    return _index.tsQualifiedName;
  }
});
Object.defineProperty(exports, "TSRestType", {
  enumerable: true,
  get: function () {
    return _index.tsRestType;
  }
});
Object.defineProperty(exports, "TSSatisfiesExpression", {
  enumerable: true,
  get: function () {
    return _index.tsSatisfiesExpression;
  }
});
Object.defineProperty(exports, "TSStringKeyword", {
  enumerable: true,
  get: function () {
    return _index.tsStringKeyword;
  }
});
Object.defineProperty(exports, "TSSymbolKeyword", {
  enumerable: true,
  get: function () {
    return _index.tsSymbolKeyword;
  }
});
Object.defineProperty(exports, "TSThisType", {
  enumerable: true,
  get: function () {
    return _index.tsThisType;
  }
});
Object.defineProperty(exports, "TSTupleType", {
  enumerable: true,
  get: function () {
    return _index.tsTupleType;
  }
});
Object.defineProperty(exports, "TSTypeAliasDeclaration", {
  enumerable: true,
  get: function () {
    return _index.tsTypeAliasDeclaration;
  }
});
Object.defineProperty(exports, "TSTypeAnnotation", {
  enumerable: true,
  get: function () {
    return _index.tsTypeAnnotation;
  }
});
Object.defineProperty(exports, "TSTypeAssertion", {
  enumerable: true,
  get: function () {
    return _index.tsTypeAssertion;
  }
});
Object.defineProperty(exports, "TSTypeLiteral", {
  enumerable: true,
  get: function () {
    return _index.tsTypeLiteral;
  }
});
Object.defineProperty(exports, "TSTypeOperator", {
  enumerable: true,
  get: function () {
    return _index.tsTypeOperator;
  }
});
Object.defineProperty(exports, "TSTypeParameter", {
  enumerable: true,
  get: function () {
    return _index.tsTypeParameter;
  }
});
Object.defineProperty(exports, "TSTypeParameterDeclaration", {
  enumerable: true,
  get: function () {
    return _index.tsTypeParameterDeclaration;
  }
});
Object.defineProperty(exports, "TSTypeParameterInstantiation", {
  enumerable: true,
  get: function () {
    return _index.tsTypeParameterInstantiation;
  }
});
Object.defineProperty(exports, "TSTypePredicate", {
  enumerable: true,
  get: function () {
    return _index.tsTypePredicate;
  }
});
Object.defineProperty(exports, "TSTypeQuery", {
  enumerable: true,
  get: function () {
    return _index.tsTypeQuery;
  }
});
Object.defineProperty(exports, "TSTypeReference", {
  enumerable: true,
  get: function () {
    return _index.tsTypeReference;
  }
});
Object.defineProperty(exports, "TSUndefinedKeyword", {
  enumerable: true,
  get: function () {
    return _index.tsUndefinedKeyword;
  }
});
Object.defineProperty(exports, "TSUnionType", {
  enumerable: true,
  get: function () {
    return _index.tsUnionType;
  }
});
Object.defineProperty(exports, "TSUnknownKeyword", {
  enumerable: true,
  get: function () {
    return _index.tsUnknownKeyword;
  }
});
Object.defineProperty(exports, "TSVoidKeyword", {
  enumerable: true,
  get: function () {
    return _index.tsVoidKeyword;
  }
});
Object.defineProperty(exports, "TaggedTemplateExpression", {
  enumerable: true,
  get: function () {
    return _index.taggedTemplateExpression;
  }
});
Object.defineProperty(exports, "TemplateElement", {
  enumerable: true,
  get: function () {
    return _index.templateElement;
  }
});
Object.defineProperty(exports, "TemplateLiteral", {
  enumerable: true,
  get: function () {
    return _index.templateLiteral;
  }
});
Object.defineProperty(exports, "ThisExpression", {
  enumerable: true,
  get: function () {
    return _index.thisExpression;
  }
});
Object.defineProperty(exports, "ThisTypeAnnotation", {
  enumerable: true,
  get: function () {
    return _index.thisTypeAnnotation;
  }
});
Object.defineProperty(exports, "ThrowStatement", {
  enumerable: true,
  get: function () {
    return _index.throwStatement;
  }
});
Object.defineProperty(exports, "TopicReference", {
  enumerable: true,
  get: function () {
    return _index.topicReference;
  }
});
Object.defineProperty(exports, "TryStatement", {
  enumerable: true,
  get: function () {
    return _index.tryStatement;
  }
});
Object.defineProperty(exports, "TupleExpression", {
  enumerable: true,
  get: function () {
    return _index.tupleExpression;
  }
});
Object.defineProperty(exports, "TupleTypeAnnotation", {
  enumerable: true,
  get: function () {
    return _index.tupleTypeAnnotation;
  }
});
Object.defineProperty(exports, "TypeAlias", {
  enumerable: true,
  get: function () {
    return _index.typeAlias;
  }
});
Object.defineProperty(exports, "TypeAnnotation", {
  enumerable: true,
  get: function () {
    return _index.typeAnnotation;
  }
});
Object.defineProperty(exports, "TypeCastExpression", {
  enumerable: true,
  get: function () {
    return _index.typeCastExpression;
  }
});
Object.defineProperty(exports, "TypeParameter", {
  enumerable: true,
  get: function () {
    return _index.typeParameter;
  }
});
Object.defineProperty(exports, "TypeParameterDeclaration", {
  enumerable: true,
  get: function () {
    return _index.typeParameterDeclaration;
  }
});
Object.defineProperty(exports, "TypeParameterInstantiation", {
  enumerable: true,
  get: function () {
    return _index.typeParameterInstantiation;
  }
});
Object.defineProperty(exports, "TypeofTypeAnnotation", {
  enumerable: true,
  get: function () {
    return _index.typeofTypeAnnotation;
  }
});
Object.defineProperty(exports, "UnaryExpression", {
  enumerable: true,
  get: function () {
    return _index.unaryExpression;
  }
});
Object.defineProperty(exports, "UnionTypeAnnotation", {
  enumerable: true,
  get: function () {
    return _index.unionTypeAnnotation;
  }
});
Object.defineProperty(exports, "UpdateExpression", {
  enumerable: true,
  get: function () {
    return _index.updateExpression;
  }
});
Object.defineProperty(exports, "V8IntrinsicIdentifier", {
  enumerable: true,
  get: function () {
    return _index.v8IntrinsicIdentifier;
  }
});
Object.defineProperty(exports, "VariableDeclaration", {
  enumerable: true,
  get: function () {
    return _index.variableDeclaration;
  }
});
Object.defineProperty(exports, "VariableDeclarator", {
  enumerable: true,
  get: function () {
    return _index.variableDeclarator;
  }
});
Object.defineProperty(exports, "Variance", {
  enumerable: true,
  get: function () {
    return _index.variance;
  }
});
Object.defineProperty(exports, "VoidTypeAnnotation", {
  enumerable: true,
  get: function () {
    return _index.voidTypeAnnotation;
  }
});
Object.defineProperty(exports, "WhileStatement", {
  enumerable: true,
  get: function () {
    return _index.whileStatement;
  }
});
Object.defineProperty(exports, "WithStatement", {
  enumerable: true,
  get: function () {
    return _index.withStatement;
  }
});
Object.defineProperty(exports, "YieldExpression", {
  enumerable: true,
  get: function () {
    return _index.yieldExpression;
  }
});
var _index = require("./index.js");



},{"./index.js":28}],30:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.buildUndefinedNode = buildUndefinedNode;
var _index = require("./generated/index.js");
function buildUndefinedNode() {
  return (0, _index.unaryExpression)("void", (0, _index.numericLiteral)(0), true);
}



},{"./generated/index.js":28}],31:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = buildChildren;
var _index = require("../../validators/generated/index.js");
var _cleanJSXElementLiteralChild = require("../../utils/react/cleanJSXElementLiteralChild.js");
function buildChildren(node) {
  const elements = [];
  for (let i = 0; i < node.children.length; i++) {
    let child = node.children[i];
    if ((0, _index.isJSXText)(child)) {
      (0, _cleanJSXElementLiteralChild.default)(child, elements);
      continue;
    }
    if ((0, _index.isJSXExpressionContainer)(child)) child = child.expression;
    if ((0, _index.isJSXEmptyExpression)(child)) continue;
    elements.push(child);
  }
  return elements;
}



},{"../../utils/react/cleanJSXElementLiteralChild.js":83,"../../validators/generated/index.js":86}],32:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = createTSUnionType;
var _index = require("../generated/index.js");
var _removeTypeDuplicates = require("../../modifications/typescript/removeTypeDuplicates.js");
var _index2 = require("../../validators/generated/index.js");
function createTSUnionType(typeAnnotations) {
  const types = typeAnnotations.map(type => {
    return (0, _index2.isTSTypeAnnotation)(type) ? type.typeAnnotation : type;
  });
  const flattened = (0, _removeTypeDuplicates.default)(types);
  if (flattened.length === 1) {
    return flattened[0];
  } else {
    return (0, _index.tsUnionType)(flattened);
  }
}



},{"../../modifications/typescript/removeTypeDuplicates.js":76,"../../validators/generated/index.js":86,"../generated/index.js":28}],33:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = validateNode;
var _validate = require("../validators/validate.js");
var _index = require("../index.js");
function validateNode(node) {
  const keys = _index.BUILDER_KEYS[node.type];
  for (const key of keys) {
    (0, _validate.default)(node, key, node[key]);
  }
  return node;
}



},{"../index.js":69,"../validators/validate.js":105}],34:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = clone;
var _cloneNode = require("./cloneNode.js");
function clone(node) {
  return (0, _cloneNode.default)(node, false);
}



},{"./cloneNode.js":37}],35:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = cloneDeep;
var _cloneNode = require("./cloneNode.js");
function cloneDeep(node) {
  return (0, _cloneNode.default)(node);
}



},{"./cloneNode.js":37}],36:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = cloneDeepWithoutLoc;
var _cloneNode = require("./cloneNode.js");
function cloneDeepWithoutLoc(node) {
  return (0, _cloneNode.default)(node, true, true);
}



},{"./cloneNode.js":37}],37:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = cloneNode;
var _index = require("../definitions/index.js");
var _index2 = require("../validators/generated/index.js");
const has = Function.call.bind(Object.prototype.hasOwnProperty);
function cloneIfNode(obj, deep, withoutLoc, commentsCache) {
  if (obj && typeof obj.type === "string") {
    return cloneNodeInternal(obj, deep, withoutLoc, commentsCache);
  }
  return obj;
}
function cloneIfNodeOrArray(obj, deep, withoutLoc, commentsCache) {
  if (Array.isArray(obj)) {
    return obj.map(node => cloneIfNode(node, deep, withoutLoc, commentsCache));
  }
  return cloneIfNode(obj, deep, withoutLoc, commentsCache);
}
function cloneNode(node, deep = true, withoutLoc = false) {
  return cloneNodeInternal(node, deep, withoutLoc, new Map());
}
function cloneNodeInternal(node, deep = true, withoutLoc = false, commentsCache) {
  if (!node) return node;
  const {
    type
  } = node;
  const newNode = {
    type: node.type
  };
  if ((0, _index2.isIdentifier)(node)) {
    newNode.name = node.name;
    if (has(node, "optional") && typeof node.optional === "boolean") {
      newNode.optional = node.optional;
    }
    if (has(node, "typeAnnotation")) {
      newNode.typeAnnotation = deep ? cloneIfNodeOrArray(node.typeAnnotation, true, withoutLoc, commentsCache) : node.typeAnnotation;
    }
  } else if (!has(_index.NODE_FIELDS, type)) {
    throw new Error(`Unknown node type: "${type}"`);
  } else {
    for (const field of Object.keys(_index.NODE_FIELDS[type])) {
      if (has(node, field)) {
        if (deep) {
          newNode[field] = (0, _index2.isFile)(node) && field === "comments" ? maybeCloneComments(node.comments, deep, withoutLoc, commentsCache) : cloneIfNodeOrArray(node[field], true, withoutLoc, commentsCache);
        } else {
          newNode[field] = node[field];
        }
      }
    }
  }
  if (has(node, "loc")) {
    if (withoutLoc) {
      newNode.loc = null;
    } else {
      newNode.loc = node.loc;
    }
  }
  if (has(node, "leadingComments")) {
    newNode.leadingComments = maybeCloneComments(node.leadingComments, deep, withoutLoc, commentsCache);
  }
  if (has(node, "innerComments")) {
    newNode.innerComments = maybeCloneComments(node.innerComments, deep, withoutLoc, commentsCache);
  }
  if (has(node, "trailingComments")) {
    newNode.trailingComments = maybeCloneComments(node.trailingComments, deep, withoutLoc, commentsCache);
  }
  if (has(node, "extra")) {
    newNode.extra = Object.assign({}, node.extra);
  }
  return newNode;
}
function maybeCloneComments(comments, deep, withoutLoc, commentsCache) {
  if (!comments || !deep) {
    return comments;
  }
  return comments.map(comment => {
    const cache = commentsCache.get(comment);
    if (cache) return cache;
    const {
      type,
      value,
      loc
    } = comment;
    const ret = {
      type,
      value,
      loc
    };
    if (withoutLoc) {
      ret.loc = null;
    }
    commentsCache.set(comment, ret);
    return ret;
  });
}



},{"../definitions/index.js":63,"../validators/generated/index.js":86}],38:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = cloneWithoutLoc;
var _cloneNode = require("./cloneNode.js");
function cloneWithoutLoc(node) {
  return (0, _cloneNode.default)(node, false, true);
}



},{"./cloneNode.js":37}],39:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = addComment;
var _addComments = require("./addComments.js");
function addComment(node, type, content, line) {
  return (0, _addComments.default)(node, type, [{
    type: line ? "CommentLine" : "CommentBlock",
    value: content
  }]);
}



},{"./addComments.js":40}],40:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = addComments;
function addComments(node, type, comments) {
  if (!comments || !node) return node;
  const key = `${type}Comments`;
  if (node[key]) {
    if (type === "leading") {
      node[key] = comments.concat(node[key]);
    } else {
      node[key].push(...comments);
    }
  } else {
    node[key] = comments;
  }
  return node;
}



},{}],41:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = inheritInnerComments;
var _inherit = require("../utils/inherit.js");
function inheritInnerComments(child, parent) {
  (0, _inherit.default)("innerComments", child, parent);
}



},{"../utils/inherit.js":82}],42:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = inheritLeadingComments;
var _inherit = require("../utils/inherit.js");
function inheritLeadingComments(child, parent) {
  (0, _inherit.default)("leadingComments", child, parent);
}



},{"../utils/inherit.js":82}],43:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = inheritTrailingComments;
var _inherit = require("../utils/inherit.js");
function inheritTrailingComments(child, parent) {
  (0, _inherit.default)("trailingComments", child, parent);
}



},{"../utils/inherit.js":82}],44:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = inheritsComments;
var _inheritTrailingComments = require("./inheritTrailingComments.js");
var _inheritLeadingComments = require("./inheritLeadingComments.js");
var _inheritInnerComments = require("./inheritInnerComments.js");
function inheritsComments(child, parent) {
  (0, _inheritTrailingComments.default)(child, parent);
  (0, _inheritLeadingComments.default)(child, parent);
  (0, _inheritInnerComments.default)(child, parent);
  return child;
}



},{"./inheritInnerComments.js":41,"./inheritLeadingComments.js":42,"./inheritTrailingComments.js":43}],45:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = removeComments;
var _index = require("../constants/index.js");
function removeComments(node) {
  _index.COMMENT_KEYS.forEach(key => {
    node[key] = null;
  });
  return node;
}



},{"../constants/index.js":47}],46:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WHILE_TYPES = exports.USERWHITESPACABLE_TYPES = exports.UNARYLIKE_TYPES = exports.TYPESCRIPT_TYPES = exports.TSTYPE_TYPES = exports.TSTYPEELEMENT_TYPES = exports.TSENTITYNAME_TYPES = exports.TSBASETYPE_TYPES = exports.TERMINATORLESS_TYPES = exports.STATEMENT_TYPES = exports.STANDARDIZED_TYPES = exports.SCOPABLE_TYPES = exports.PUREISH_TYPES = exports.PROPERTY_TYPES = exports.PRIVATE_TYPES = exports.PATTERN_TYPES = exports.PATTERNLIKE_TYPES = exports.OBJECTMEMBER_TYPES = exports.MODULESPECIFIER_TYPES = exports.MODULEDECLARATION_TYPES = exports.MISCELLANEOUS_TYPES = exports.METHOD_TYPES = exports.LVAL_TYPES = exports.LOOP_TYPES = exports.LITERAL_TYPES = exports.JSX_TYPES = exports.IMPORTOREXPORTDECLARATION_TYPES = exports.IMMUTABLE_TYPES = exports.FUNCTION_TYPES = exports.FUNCTIONPARENT_TYPES = exports.FOR_TYPES = exports.FORXSTATEMENT_TYPES = exports.FLOW_TYPES = exports.FLOWTYPE_TYPES = exports.FLOWPREDICATE_TYPES = exports.FLOWDECLARATION_TYPES = exports.FLOWBASEANNOTATION_TYPES = exports.EXPRESSION_TYPES = exports.EXPRESSIONWRAPPER_TYPES = exports.EXPORTDECLARATION_TYPES = exports.ENUMMEMBER_TYPES = exports.ENUMBODY_TYPES = exports.DECLARATION_TYPES = exports.CONDITIONAL_TYPES = exports.COMPLETIONSTATEMENT_TYPES = exports.CLASS_TYPES = exports.BLOCK_TYPES = exports.BLOCKPARENT_TYPES = exports.BINARY_TYPES = exports.ACCESSOR_TYPES = void 0;
var _index = require("../../definitions/index.js");
const STANDARDIZED_TYPES = exports.STANDARDIZED_TYPES = _index.FLIPPED_ALIAS_KEYS["Standardized"];
const EXPRESSION_TYPES = exports.EXPRESSION_TYPES = _index.FLIPPED_ALIAS_KEYS["Expression"];
const BINARY_TYPES = exports.BINARY_TYPES = _index.FLIPPED_ALIAS_KEYS["Binary"];
const SCOPABLE_TYPES = exports.SCOPABLE_TYPES = _index.FLIPPED_ALIAS_KEYS["Scopable"];
const BLOCKPARENT_TYPES = exports.BLOCKPARENT_TYPES = _index.FLIPPED_ALIAS_KEYS["BlockParent"];
const BLOCK_TYPES = exports.BLOCK_TYPES = _index.FLIPPED_ALIAS_KEYS["Block"];
const STATEMENT_TYPES = exports.STATEMENT_TYPES = _index.FLIPPED_ALIAS_KEYS["Statement"];
const TERMINATORLESS_TYPES = exports.TERMINATORLESS_TYPES = _index.FLIPPED_ALIAS_KEYS["Terminatorless"];
const COMPLETIONSTATEMENT_TYPES = exports.COMPLETIONSTATEMENT_TYPES = _index.FLIPPED_ALIAS_KEYS["CompletionStatement"];
const CONDITIONAL_TYPES = exports.CONDITIONAL_TYPES = _index.FLIPPED_ALIAS_KEYS["Conditional"];
const LOOP_TYPES = exports.LOOP_TYPES = _index.FLIPPED_ALIAS_KEYS["Loop"];
const WHILE_TYPES = exports.WHILE_TYPES = _index.FLIPPED_ALIAS_KEYS["While"];
const EXPRESSIONWRAPPER_TYPES = exports.EXPRESSIONWRAPPER_TYPES = _index.FLIPPED_ALIAS_KEYS["ExpressionWrapper"];
const FOR_TYPES = exports.FOR_TYPES = _index.FLIPPED_ALIAS_KEYS["For"];
const FORXSTATEMENT_TYPES = exports.FORXSTATEMENT_TYPES = _index.FLIPPED_ALIAS_KEYS["ForXStatement"];
const FUNCTION_TYPES = exports.FUNCTION_TYPES = _index.FLIPPED_ALIAS_KEYS["Function"];
const FUNCTIONPARENT_TYPES = exports.FUNCTIONPARENT_TYPES = _index.FLIPPED_ALIAS_KEYS["FunctionParent"];
const PUREISH_TYPES = exports.PUREISH_TYPES = _index.FLIPPED_ALIAS_KEYS["Pureish"];
const DECLARATION_TYPES = exports.DECLARATION_TYPES = _index.FLIPPED_ALIAS_KEYS["Declaration"];
const PATTERNLIKE_TYPES = exports.PATTERNLIKE_TYPES = _index.FLIPPED_ALIAS_KEYS["PatternLike"];
const LVAL_TYPES = exports.LVAL_TYPES = _index.FLIPPED_ALIAS_KEYS["LVal"];
const TSENTITYNAME_TYPES = exports.TSENTITYNAME_TYPES = _index.FLIPPED_ALIAS_KEYS["TSEntityName"];
const LITERAL_TYPES = exports.LITERAL_TYPES = _index.FLIPPED_ALIAS_KEYS["Literal"];
const IMMUTABLE_TYPES = exports.IMMUTABLE_TYPES = _index.FLIPPED_ALIAS_KEYS["Immutable"];
const USERWHITESPACABLE_TYPES = exports.USERWHITESPACABLE_TYPES = _index.FLIPPED_ALIAS_KEYS["UserWhitespacable"];
const METHOD_TYPES = exports.METHOD_TYPES = _index.FLIPPED_ALIAS_KEYS["Method"];
const OBJECTMEMBER_TYPES = exports.OBJECTMEMBER_TYPES = _index.FLIPPED_ALIAS_KEYS["ObjectMember"];
const PROPERTY_TYPES = exports.PROPERTY_TYPES = _index.FLIPPED_ALIAS_KEYS["Property"];
const UNARYLIKE_TYPES = exports.UNARYLIKE_TYPES = _index.FLIPPED_ALIAS_KEYS["UnaryLike"];
const PATTERN_TYPES = exports.PATTERN_TYPES = _index.FLIPPED_ALIAS_KEYS["Pattern"];
const CLASS_TYPES = exports.CLASS_TYPES = _index.FLIPPED_ALIAS_KEYS["Class"];
const IMPORTOREXPORTDECLARATION_TYPES = exports.IMPORTOREXPORTDECLARATION_TYPES = _index.FLIPPED_ALIAS_KEYS["ImportOrExportDeclaration"];
const EXPORTDECLARATION_TYPES = exports.EXPORTDECLARATION_TYPES = _index.FLIPPED_ALIAS_KEYS["ExportDeclaration"];
const MODULESPECIFIER_TYPES = exports.MODULESPECIFIER_TYPES = _index.FLIPPED_ALIAS_KEYS["ModuleSpecifier"];
const ACCESSOR_TYPES = exports.ACCESSOR_TYPES = _index.FLIPPED_ALIAS_KEYS["Accessor"];
const PRIVATE_TYPES = exports.PRIVATE_TYPES = _index.FLIPPED_ALIAS_KEYS["Private"];
const FLOW_TYPES = exports.FLOW_TYPES = _index.FLIPPED_ALIAS_KEYS["Flow"];
const FLOWTYPE_TYPES = exports.FLOWTYPE_TYPES = _index.FLIPPED_ALIAS_KEYS["FlowType"];
const FLOWBASEANNOTATION_TYPES = exports.FLOWBASEANNOTATION_TYPES = _index.FLIPPED_ALIAS_KEYS["FlowBaseAnnotation"];
const FLOWDECLARATION_TYPES = exports.FLOWDECLARATION_TYPES = _index.FLIPPED_ALIAS_KEYS["FlowDeclaration"];
const FLOWPREDICATE_TYPES = exports.FLOWPREDICATE_TYPES = _index.FLIPPED_ALIAS_KEYS["FlowPredicate"];
const ENUMBODY_TYPES = exports.ENUMBODY_TYPES = _index.FLIPPED_ALIAS_KEYS["EnumBody"];
const ENUMMEMBER_TYPES = exports.ENUMMEMBER_TYPES = _index.FLIPPED_ALIAS_KEYS["EnumMember"];
const JSX_TYPES = exports.JSX_TYPES = _index.FLIPPED_ALIAS_KEYS["JSX"];
const MISCELLANEOUS_TYPES = exports.MISCELLANEOUS_TYPES = _index.FLIPPED_ALIAS_KEYS["Miscellaneous"];
const TYPESCRIPT_TYPES = exports.TYPESCRIPT_TYPES = _index.FLIPPED_ALIAS_KEYS["TypeScript"];
const TSTYPEELEMENT_TYPES = exports.TSTYPEELEMENT_TYPES = _index.FLIPPED_ALIAS_KEYS["TSTypeElement"];
const TSTYPE_TYPES = exports.TSTYPE_TYPES = _index.FLIPPED_ALIAS_KEYS["TSType"];
const TSBASETYPE_TYPES = exports.TSBASETYPE_TYPES = _index.FLIPPED_ALIAS_KEYS["TSBaseType"];
const MODULEDECLARATION_TYPES = exports.MODULEDECLARATION_TYPES = IMPORTOREXPORTDECLARATION_TYPES;



},{"../../definitions/index.js":63}],47:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.UPDATE_OPERATORS = exports.UNARY_OPERATORS = exports.STRING_UNARY_OPERATORS = exports.STATEMENT_OR_BLOCK_KEYS = exports.NUMBER_UNARY_OPERATORS = exports.NUMBER_BINARY_OPERATORS = exports.NOT_LOCAL_BINDING = exports.LOGICAL_OPERATORS = exports.INHERIT_KEYS = exports.FOR_INIT_KEYS = exports.FLATTENABLE_KEYS = exports.EQUALITY_BINARY_OPERATORS = exports.COMPARISON_BINARY_OPERATORS = exports.COMMENT_KEYS = exports.BOOLEAN_UNARY_OPERATORS = exports.BOOLEAN_NUMBER_BINARY_OPERATORS = exports.BOOLEAN_BINARY_OPERATORS = exports.BLOCK_SCOPED_SYMBOL = exports.BINARY_OPERATORS = exports.ASSIGNMENT_OPERATORS = void 0;
const STATEMENT_OR_BLOCK_KEYS = exports.STATEMENT_OR_BLOCK_KEYS = ["consequent", "body", "alternate"];
const FLATTENABLE_KEYS = exports.FLATTENABLE_KEYS = ["body", "expressions"];
const FOR_INIT_KEYS = exports.FOR_INIT_KEYS = ["left", "init"];
const COMMENT_KEYS = exports.COMMENT_KEYS = ["leadingComments", "trailingComments", "innerComments"];
const LOGICAL_OPERATORS = exports.LOGICAL_OPERATORS = ["||", "&&", "??"];
const UPDATE_OPERATORS = exports.UPDATE_OPERATORS = ["++", "--"];
const BOOLEAN_NUMBER_BINARY_OPERATORS = exports.BOOLEAN_NUMBER_BINARY_OPERATORS = [">", "<", ">=", "<="];
const EQUALITY_BINARY_OPERATORS = exports.EQUALITY_BINARY_OPERATORS = ["==", "===", "!=", "!=="];
const COMPARISON_BINARY_OPERATORS = exports.COMPARISON_BINARY_OPERATORS = [...EQUALITY_BINARY_OPERATORS, "in", "instanceof"];
const BOOLEAN_BINARY_OPERATORS = exports.BOOLEAN_BINARY_OPERATORS = [...COMPARISON_BINARY_OPERATORS, ...BOOLEAN_NUMBER_BINARY_OPERATORS];
const NUMBER_BINARY_OPERATORS = exports.NUMBER_BINARY_OPERATORS = ["-", "/", "%", "*", "**", "&", "|", ">>", ">>>", "<<", "^"];
const BINARY_OPERATORS = exports.BINARY_OPERATORS = ["+", ...NUMBER_BINARY_OPERATORS, ...BOOLEAN_BINARY_OPERATORS, "|>"];
const ASSIGNMENT_OPERATORS = exports.ASSIGNMENT_OPERATORS = ["=", "+=", ...NUMBER_BINARY_OPERATORS.map(op => op + "="), ...LOGICAL_OPERATORS.map(op => op + "=")];
const BOOLEAN_UNARY_OPERATORS = exports.BOOLEAN_UNARY_OPERATORS = ["delete", "!"];
const NUMBER_UNARY_OPERATORS = exports.NUMBER_UNARY_OPERATORS = ["+", "-", "~"];
const STRING_UNARY_OPERATORS = exports.STRING_UNARY_OPERATORS = ["typeof"];
const UNARY_OPERATORS = exports.UNARY_OPERATORS = ["void", "throw", ...BOOLEAN_UNARY_OPERATORS, ...NUMBER_UNARY_OPERATORS, ...STRING_UNARY_OPERATORS];
const INHERIT_KEYS = exports.INHERIT_KEYS = {
  optional: ["typeAnnotation", "typeParameters", "returnType"],
  force: ["start", "loc", "end"]
};
const BLOCK_SCOPED_SYMBOL = exports.BLOCK_SCOPED_SYMBOL = Symbol.for("var used to be block scoped");
const NOT_LOCAL_BINDING = exports.NOT_LOCAL_BINDING = Symbol.for("should not be considered a local binding");



},{}],48:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = ensureBlock;
var _toBlock = require("./toBlock.js");
function ensureBlock(node, key = "body") {
  const result = (0, _toBlock.default)(node[key], node);
  node[key] = result;
  return result;
}



},{"./toBlock.js":51}],49:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = gatherSequenceExpressions;
var _getBindingIdentifiers = require("../retrievers/getBindingIdentifiers.js");
var _index = require("../validators/generated/index.js");
var _index2 = require("../builders/generated/index.js");
var _cloneNode = require("../clone/cloneNode.js");
;
function gatherSequenceExpressions(nodes, scope, declars) {
  const exprs = [];
  let ensureLastUndefined = true;
  for (const node of nodes) {
    if (!(0, _index.isEmptyStatement)(node)) {
      ensureLastUndefined = false;
    }
    if ((0, _index.isExpression)(node)) {
      exprs.push(node);
    } else if ((0, _index.isExpressionStatement)(node)) {
      exprs.push(node.expression);
    } else if ((0, _index.isVariableDeclaration)(node)) {
      if (node.kind !== "var") return;
      for (const declar of node.declarations) {
        const bindings = (0, _getBindingIdentifiers.default)(declar);
        for (const key of Object.keys(bindings)) {
          declars.push({
            kind: node.kind,
            id: (0, _cloneNode.default)(bindings[key])
          });
        }
        if (declar.init) {
          exprs.push((0, _index2.assignmentExpression)("=", declar.id, declar.init));
        }
      }
      ensureLastUndefined = true;
    } else if ((0, _index.isIfStatement)(node)) {
      const consequent = node.consequent ? gatherSequenceExpressions([node.consequent], scope, declars) : scope.buildUndefinedNode();
      const alternate = node.alternate ? gatherSequenceExpressions([node.alternate], scope, declars) : scope.buildUndefinedNode();
      if (!consequent || !alternate) return;
      exprs.push((0, _index2.conditionalExpression)(node.test, consequent, alternate));
    } else if ((0, _index.isBlockStatement)(node)) {
      const body = gatherSequenceExpressions(node.body, scope, declars);
      if (!body) return;
      exprs.push(body);
    } else if ((0, _index.isEmptyStatement)(node)) {
      if (nodes.indexOf(node) === 0) {
        ensureLastUndefined = true;
      }
    } else {
      return;
    }
  }
  if (ensureLastUndefined) {
    exprs.push(scope.buildUndefinedNode());
  }
  if (exprs.length === 1) {
    return exprs[0];
  } else {
    return (0, _index2.sequenceExpression)(exprs);
  }
}



},{"../builders/generated/index.js":28,"../clone/cloneNode.js":37,"../retrievers/getBindingIdentifiers.js":77,"../validators/generated/index.js":86}],50:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = toBindingIdentifierName;
var _toIdentifier = require("./toIdentifier.js");
function toBindingIdentifierName(name) {
  name = (0, _toIdentifier.default)(name);
  if (name === "eval" || name === "arguments") name = "_" + name;
  return name;
}



},{"./toIdentifier.js":54}],51:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = toBlock;
var _index = require("../validators/generated/index.js");
var _index2 = require("../builders/generated/index.js");
function toBlock(node, parent) {
  if ((0, _index.isBlockStatement)(node)) {
    return node;
  }
  let blockNodes = [];
  if ((0, _index.isEmptyStatement)(node)) {
    blockNodes = [];
  } else {
    if (!(0, _index.isStatement)(node)) {
      if ((0, _index.isFunction)(parent)) {
        node = (0, _index2.returnStatement)(node);
      } else {
        node = (0, _index2.expressionStatement)(node);
      }
    }
    blockNodes = [node];
  }
  return (0, _index2.blockStatement)(blockNodes);
}



},{"../builders/generated/index.js":28,"../validators/generated/index.js":86}],52:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = toComputedKey;
var _index = require("../validators/generated/index.js");
var _index2 = require("../builders/generated/index.js");
function toComputedKey(node, key = node.key || node.property) {
  if (!node.computed && (0, _index.isIdentifier)(key)) key = (0, _index2.stringLiteral)(key.name);
  return key;
}



},{"../builders/generated/index.js":28,"../validators/generated/index.js":86}],53:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _index = require("../validators/generated/index.js");
var _default = exports.default = toExpression;
function toExpression(node) {
  if ((0, _index.isExpressionStatement)(node)) {
    node = node.expression;
  }
  if ((0, _index.isExpression)(node)) {
    return node;
  }
  if ((0, _index.isClass)(node)) {
    node.type = "ClassExpression";
  } else if ((0, _index.isFunction)(node)) {
    node.type = "FunctionExpression";
  }
  if (!(0, _index.isExpression)(node)) {
    throw new Error(`cannot turn ${node.type} to an expression`);
  }
  return node;
}



},{"../validators/generated/index.js":86}],54:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = toIdentifier;
var _isValidIdentifier = require("../validators/isValidIdentifier.js");
var _helperValidatorIdentifier = require("@babel/helper-validator-identifier");
function toIdentifier(input) {
  input = input + "";
  let name = "";
  for (const c of input) {
    name += (0, _helperValidatorIdentifier.isIdentifierChar)(c.codePointAt(0)) ? c : "-";
  }
  name = name.replace(/^[-0-9]+/, "");
  name = name.replace(/[-\s]+(.)?/g, function (match, c) {
    return c ? c.toUpperCase() : "";
  });
  if (!(0, _isValidIdentifier.default)(name)) {
    name = `_${name}`;
  }
  return name || "_";
}



},{"../validators/isValidIdentifier.js":100,"@babel/helper-validator-identifier":22}],55:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = toKeyAlias;
var _index = require("../validators/generated/index.js");
var _cloneNode = require("../clone/cloneNode.js");
var _removePropertiesDeep = require("../modifications/removePropertiesDeep.js");
function toKeyAlias(node, key = node.key) {
  let alias;
  if (node.kind === "method") {
    return toKeyAlias.increment() + "";
  } else if ((0, _index.isIdentifier)(key)) {
    alias = key.name;
  } else if ((0, _index.isStringLiteral)(key)) {
    alias = JSON.stringify(key.value);
  } else {
    alias = JSON.stringify((0, _removePropertiesDeep.default)((0, _cloneNode.default)(key)));
  }
  if (node.computed) {
    alias = `[${alias}]`;
  }
  if (node.static) {
    alias = `static:${alias}`;
  }
  return alias;
}
toKeyAlias.uid = 0;
toKeyAlias.increment = function () {
  if (toKeyAlias.uid >= Number.MAX_SAFE_INTEGER) {
    return toKeyAlias.uid = 0;
  } else {
    return toKeyAlias.uid++;
  }
};



},{"../clone/cloneNode.js":37,"../modifications/removePropertiesDeep.js":75,"../validators/generated/index.js":86}],56:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = toSequenceExpression;
var _gatherSequenceExpressions = require("./gatherSequenceExpressions.js");
;
function toSequenceExpression(nodes, scope) {
  if (!(nodes != null && nodes.length)) return;
  const declars = [];
  const result = (0, _gatherSequenceExpressions.default)(nodes, scope, declars);
  if (!result) return;
  for (const declar of declars) {
    scope.push(declar);
  }
  return result;
}



},{"./gatherSequenceExpressions.js":49}],57:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _index = require("../validators/generated/index.js");
var _index2 = require("../builders/generated/index.js");
var _default = exports.default = toStatement;
function toStatement(node, ignore) {
  if ((0, _index.isStatement)(node)) {
    return node;
  }
  let mustHaveId = false;
  let newType;
  if ((0, _index.isClass)(node)) {
    mustHaveId = true;
    newType = "ClassDeclaration";
  } else if ((0, _index.isFunction)(node)) {
    mustHaveId = true;
    newType = "FunctionDeclaration";
  } else if ((0, _index.isAssignmentExpression)(node)) {
    return (0, _index2.expressionStatement)(node);
  }
  if (mustHaveId && !node.id) {
    newType = false;
  }
  if (!newType) {
    if (ignore) {
      return false;
    } else {
      throw new Error(`cannot turn ${node.type} to a statement`);
    }
  }
  node.type = newType;
  return node;
}



},{"../builders/generated/index.js":28,"../validators/generated/index.js":86}],58:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _isValidIdentifier = require("../validators/isValidIdentifier.js");
var _index = require("../builders/generated/index.js");
var _default = exports.default = valueToNode;
const objectToString = Function.call.bind(Object.prototype.toString);
function isRegExp(value) {
  return objectToString(value) === "[object RegExp]";
}
function isPlainObject(value) {
  if (typeof value !== "object" || value === null || Object.prototype.toString.call(value) !== "[object Object]") {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === null || Object.getPrototypeOf(proto) === null;
}
function valueToNode(value) {
  if (value === undefined) {
    return (0, _index.identifier)("undefined");
  }
  if (value === true || value === false) {
    return (0, _index.booleanLiteral)(value);
  }
  if (value === null) {
    return (0, _index.nullLiteral)();
  }
  if (typeof value === "string") {
    return (0, _index.stringLiteral)(value);
  }
  if (typeof value === "number") {
    let result;
    if (Number.isFinite(value)) {
      result = (0, _index.numericLiteral)(Math.abs(value));
    } else {
      let numerator;
      if (Number.isNaN(value)) {
        numerator = (0, _index.numericLiteral)(0);
      } else {
        numerator = (0, _index.numericLiteral)(1);
      }
      result = (0, _index.binaryExpression)("/", numerator, (0, _index.numericLiteral)(0));
    }
    if (value < 0 || Object.is(value, -0)) {
      result = (0, _index.unaryExpression)("-", result);
    }
    return result;
  }
  if (isRegExp(value)) {
    const pattern = value.source;
    const flags = value.toString().match(/\/([a-z]+|)$/)[1];
    return (0, _index.regExpLiteral)(pattern, flags);
  }
  if (Array.isArray(value)) {
    return (0, _index.arrayExpression)(value.map(valueToNode));
  }
  if (isPlainObject(value)) {
    const props = [];
    for (const key of Object.keys(value)) {
      let nodeKey;
      if ((0, _isValidIdentifier.default)(key)) {
        nodeKey = (0, _index.identifier)(key);
      } else {
        nodeKey = (0, _index.stringLiteral)(key);
      }
      props.push((0, _index.objectProperty)(nodeKey, valueToNode(value[key])));
    }
    return (0, _index.objectExpression)(props);
  }
  throw new Error("don't know how to turn this value into a node");
}



},{"../builders/generated/index.js":28,"../validators/isValidIdentifier.js":100}],59:[function(require,module,exports){
(function (process){(function (){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.patternLikeCommon = exports.functionTypeAnnotationCommon = exports.functionDeclarationCommon = exports.functionCommon = exports.classMethodOrPropertyCommon = exports.classMethodOrDeclareMethodCommon = void 0;
var _is = require("../validators/is.js");
var _isValidIdentifier = require("../validators/isValidIdentifier.js");
var _helperValidatorIdentifier = require("@babel/helper-validator-identifier");
var _helperStringParser = require("@babel/helper-string-parser");
var _index = require("../constants/index.js");
var _utils = require("./utils.js");
const defineType = (0, _utils.defineAliasedType)("Standardized");
defineType("ArrayExpression", {
  fields: {
    elements: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeOrValueType)("null", "Expression", "SpreadElement"))),
      default: !process.env.BABEL_TYPES_8_BREAKING ? [] : undefined
    }
  },
  visitor: ["elements"],
  aliases: ["Expression"]
});
defineType("AssignmentExpression", {
  fields: {
    operator: {
      validate: function () {
        if (!process.env.BABEL_TYPES_8_BREAKING) {
          return (0, _utils.assertValueType)("string");
        }
        const identifier = (0, _utils.assertOneOf)(..._index.ASSIGNMENT_OPERATORS);
        const pattern = (0, _utils.assertOneOf)("=");
        return function (node, key, val) {
          const validator = (0, _is.default)("Pattern", node.left) ? pattern : identifier;
          validator(node, key, val);
        };
      }()
    },
    left: {
      validate: !process.env.BABEL_TYPES_8_BREAKING ? (0, _utils.assertNodeType)("LVal", "OptionalMemberExpression") : (0, _utils.assertNodeType)("Identifier", "MemberExpression", "OptionalMemberExpression", "ArrayPattern", "ObjectPattern", "TSAsExpression", "TSSatisfiesExpression", "TSTypeAssertion", "TSNonNullExpression")
    },
    right: {
      validate: (0, _utils.assertNodeType)("Expression")
    }
  },
  builder: ["operator", "left", "right"],
  visitor: ["left", "right"],
  aliases: ["Expression"]
});
defineType("BinaryExpression", {
  builder: ["operator", "left", "right"],
  fields: {
    operator: {
      validate: (0, _utils.assertOneOf)(..._index.BINARY_OPERATORS)
    },
    left: {
      validate: function () {
        const expression = (0, _utils.assertNodeType)("Expression");
        const inOp = (0, _utils.assertNodeType)("Expression", "PrivateName");
        const validator = Object.assign(function (node, key, val) {
          const validator = node.operator === "in" ? inOp : expression;
          validator(node, key, val);
        }, {
          oneOfNodeTypes: ["Expression", "PrivateName"]
        });
        return validator;
      }()
    },
    right: {
      validate: (0, _utils.assertNodeType)("Expression")
    }
  },
  visitor: ["left", "right"],
  aliases: ["Binary", "Expression"]
});
defineType("InterpreterDirective", {
  builder: ["value"],
  fields: {
    value: {
      validate: (0, _utils.assertValueType)("string")
    }
  }
});
defineType("Directive", {
  visitor: ["value"],
  fields: {
    value: {
      validate: (0, _utils.assertNodeType)("DirectiveLiteral")
    }
  }
});
defineType("DirectiveLiteral", {
  builder: ["value"],
  fields: {
    value: {
      validate: (0, _utils.assertValueType)("string")
    }
  }
});
defineType("BlockStatement", {
  builder: ["body", "directives"],
  visitor: ["directives", "body"],
  fields: {
    directives: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("Directive"))),
      default: []
    },
    body: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("Statement")))
    }
  },
  aliases: ["Scopable", "BlockParent", "Block", "Statement"]
});
defineType("BreakStatement", {
  visitor: ["label"],
  fields: {
    label: {
      validate: (0, _utils.assertNodeType)("Identifier"),
      optional: true
    }
  },
  aliases: ["Statement", "Terminatorless", "CompletionStatement"]
});
defineType("CallExpression", {
  visitor: ["callee", "arguments", "typeParameters", "typeArguments"],
  builder: ["callee", "arguments"],
  aliases: ["Expression"],
  fields: Object.assign({
    callee: {
      validate: (0, _utils.assertNodeType)("Expression", "Super", "V8IntrinsicIdentifier")
    },
    arguments: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("Expression", "SpreadElement", "JSXNamespacedName", "ArgumentPlaceholder")))
    }
  }, !process.env.BABEL_TYPES_8_BREAKING ? {
    optional: {
      validate: (0, _utils.assertOneOf)(true, false),
      optional: true
    }
  } : {}, {
    typeArguments: {
      validate: (0, _utils.assertNodeType)("TypeParameterInstantiation"),
      optional: true
    },
    typeParameters: {
      validate: (0, _utils.assertNodeType)("TSTypeParameterInstantiation"),
      optional: true
    }
  })
});
defineType("CatchClause", {
  visitor: ["param", "body"],
  fields: {
    param: {
      validate: (0, _utils.assertNodeType)("Identifier", "ArrayPattern", "ObjectPattern"),
      optional: true
    },
    body: {
      validate: (0, _utils.assertNodeType)("BlockStatement")
    }
  },
  aliases: ["Scopable", "BlockParent"]
});
defineType("ConditionalExpression", {
  visitor: ["test", "consequent", "alternate"],
  fields: {
    test: {
      validate: (0, _utils.assertNodeType)("Expression")
    },
    consequent: {
      validate: (0, _utils.assertNodeType)("Expression")
    },
    alternate: {
      validate: (0, _utils.assertNodeType)("Expression")
    }
  },
  aliases: ["Expression", "Conditional"]
});
defineType("ContinueStatement", {
  visitor: ["label"],
  fields: {
    label: {
      validate: (0, _utils.assertNodeType)("Identifier"),
      optional: true
    }
  },
  aliases: ["Statement", "Terminatorless", "CompletionStatement"]
});
defineType("DebuggerStatement", {
  aliases: ["Statement"]
});
defineType("DoWhileStatement", {
  visitor: ["test", "body"],
  fields: {
    test: {
      validate: (0, _utils.assertNodeType)("Expression")
    },
    body: {
      validate: (0, _utils.assertNodeType)("Statement")
    }
  },
  aliases: ["Statement", "BlockParent", "Loop", "While", "Scopable"]
});
defineType("EmptyStatement", {
  aliases: ["Statement"]
});
defineType("ExpressionStatement", {
  visitor: ["expression"],
  fields: {
    expression: {
      validate: (0, _utils.assertNodeType)("Expression")
    }
  },
  aliases: ["Statement", "ExpressionWrapper"]
});
defineType("File", {
  builder: ["program", "comments", "tokens"],
  visitor: ["program"],
  fields: {
    program: {
      validate: (0, _utils.assertNodeType)("Program")
    },
    comments: {
      validate: !process.env.BABEL_TYPES_8_BREAKING ? Object.assign(() => {}, {
        each: {
          oneOfNodeTypes: ["CommentBlock", "CommentLine"]
        }
      }) : (0, _utils.assertEach)((0, _utils.assertNodeType)("CommentBlock", "CommentLine")),
      optional: true
    },
    tokens: {
      validate: (0, _utils.assertEach)(Object.assign(() => {}, {
        type: "any"
      })),
      optional: true
    }
  }
});
defineType("ForInStatement", {
  visitor: ["left", "right", "body"],
  aliases: ["Scopable", "Statement", "For", "BlockParent", "Loop", "ForXStatement"],
  fields: {
    left: {
      validate: !process.env.BABEL_TYPES_8_BREAKING ? (0, _utils.assertNodeType)("VariableDeclaration", "LVal") : (0, _utils.assertNodeType)("VariableDeclaration", "Identifier", "MemberExpression", "ArrayPattern", "ObjectPattern", "TSAsExpression", "TSSatisfiesExpression", "TSTypeAssertion", "TSNonNullExpression")
    },
    right: {
      validate: (0, _utils.assertNodeType)("Expression")
    },
    body: {
      validate: (0, _utils.assertNodeType)("Statement")
    }
  }
});
defineType("ForStatement", {
  visitor: ["init", "test", "update", "body"],
  aliases: ["Scopable", "Statement", "For", "BlockParent", "Loop"],
  fields: {
    init: {
      validate: (0, _utils.assertNodeType)("VariableDeclaration", "Expression"),
      optional: true
    },
    test: {
      validate: (0, _utils.assertNodeType)("Expression"),
      optional: true
    },
    update: {
      validate: (0, _utils.assertNodeType)("Expression"),
      optional: true
    },
    body: {
      validate: (0, _utils.assertNodeType)("Statement")
    }
  }
});
const functionCommon = () => ({
  params: {
    validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("Identifier", "Pattern", "RestElement")))
  },
  generator: {
    default: false
  },
  async: {
    default: false
  }
});
exports.functionCommon = functionCommon;
const functionTypeAnnotationCommon = () => ({
  returnType: {
    validate: (0, _utils.assertNodeType)("TypeAnnotation", "TSTypeAnnotation", "Noop"),
    optional: true
  },
  typeParameters: {
    validate: (0, _utils.assertNodeType)("TypeParameterDeclaration", "TSTypeParameterDeclaration", "Noop"),
    optional: true
  }
});
exports.functionTypeAnnotationCommon = functionTypeAnnotationCommon;
const functionDeclarationCommon = () => Object.assign({}, functionCommon(), {
  declare: {
    validate: (0, _utils.assertValueType)("boolean"),
    optional: true
  },
  id: {
    validate: (0, _utils.assertNodeType)("Identifier"),
    optional: true
  }
});
exports.functionDeclarationCommon = functionDeclarationCommon;
defineType("FunctionDeclaration", {
  builder: ["id", "params", "body", "generator", "async"],
  visitor: ["id", "params", "body", "returnType", "typeParameters"],
  fields: Object.assign({}, functionDeclarationCommon(), functionTypeAnnotationCommon(), {
    body: {
      validate: (0, _utils.assertNodeType)("BlockStatement")
    },
    predicate: {
      validate: (0, _utils.assertNodeType)("DeclaredPredicate", "InferredPredicate"),
      optional: true
    }
  }),
  aliases: ["Scopable", "Function", "BlockParent", "FunctionParent", "Statement", "Pureish", "Declaration"],
  validate: function () {
    if (!process.env.BABEL_TYPES_8_BREAKING) return () => {};
    const identifier = (0, _utils.assertNodeType)("Identifier");
    return function (parent, key, node) {
      if (!(0, _is.default)("ExportDefaultDeclaration", parent)) {
        identifier(node, "id", node.id);
      }
    };
  }()
});
defineType("FunctionExpression", {
  inherits: "FunctionDeclaration",
  aliases: ["Scopable", "Function", "BlockParent", "FunctionParent", "Expression", "Pureish"],
  fields: Object.assign({}, functionCommon(), functionTypeAnnotationCommon(), {
    id: {
      validate: (0, _utils.assertNodeType)("Identifier"),
      optional: true
    },
    body: {
      validate: (0, _utils.assertNodeType)("BlockStatement")
    },
    predicate: {
      validate: (0, _utils.assertNodeType)("DeclaredPredicate", "InferredPredicate"),
      optional: true
    }
  })
});
const patternLikeCommon = () => ({
  typeAnnotation: {
    validate: (0, _utils.assertNodeType)("TypeAnnotation", "TSTypeAnnotation", "Noop"),
    optional: true
  },
  optional: {
    validate: (0, _utils.assertValueType)("boolean"),
    optional: true
  },
  decorators: {
    validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("Decorator"))),
    optional: true
  }
});
exports.patternLikeCommon = patternLikeCommon;
defineType("Identifier", {
  builder: ["name"],
  visitor: ["typeAnnotation", "decorators"],
  aliases: ["Expression", "PatternLike", "LVal", "TSEntityName"],
  fields: Object.assign({}, patternLikeCommon(), {
    name: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("string"), Object.assign(function (node, key, val) {
        if (!process.env.BABEL_TYPES_8_BREAKING) return;
        if (!(0, _isValidIdentifier.default)(val, false)) {
          throw new TypeError(`"${val}" is not a valid identifier name`);
        }
      }, {
        type: "string"
      }))
    }
  }),
  validate(parent, key, node) {
    if (!process.env.BABEL_TYPES_8_BREAKING) return;
    const match = /\.(\w+)$/.exec(key);
    if (!match) return;
    const [, parentKey] = match;
    const nonComp = {
      computed: false
    };
    if (parentKey === "property") {
      if ((0, _is.default)("MemberExpression", parent, nonComp)) return;
      if ((0, _is.default)("OptionalMemberExpression", parent, nonComp)) return;
    } else if (parentKey === "key") {
      if ((0, _is.default)("Property", parent, nonComp)) return;
      if ((0, _is.default)("Method", parent, nonComp)) return;
    } else if (parentKey === "exported") {
      if ((0, _is.default)("ExportSpecifier", parent)) return;
    } else if (parentKey === "imported") {
      if ((0, _is.default)("ImportSpecifier", parent, {
        imported: node
      })) return;
    } else if (parentKey === "meta") {
      if ((0, _is.default)("MetaProperty", parent, {
        meta: node
      })) return;
    }
    if (((0, _helperValidatorIdentifier.isKeyword)(node.name) || (0, _helperValidatorIdentifier.isReservedWord)(node.name, false)) && node.name !== "this") {
      throw new TypeError(`"${node.name}" is not a valid identifier`);
    }
  }
});
defineType("IfStatement", {
  visitor: ["test", "consequent", "alternate"],
  aliases: ["Statement", "Conditional"],
  fields: {
    test: {
      validate: (0, _utils.assertNodeType)("Expression")
    },
    consequent: {
      validate: (0, _utils.assertNodeType)("Statement")
    },
    alternate: {
      optional: true,
      validate: (0, _utils.assertNodeType)("Statement")
    }
  }
});
defineType("LabeledStatement", {
  visitor: ["label", "body"],
  aliases: ["Statement"],
  fields: {
    label: {
      validate: (0, _utils.assertNodeType)("Identifier")
    },
    body: {
      validate: (0, _utils.assertNodeType)("Statement")
    }
  }
});
defineType("StringLiteral", {
  builder: ["value"],
  fields: {
    value: {
      validate: (0, _utils.assertValueType)("string")
    }
  },
  aliases: ["Expression", "Pureish", "Literal", "Immutable"]
});
defineType("NumericLiteral", {
  builder: ["value"],
  deprecatedAlias: "NumberLiteral",
  fields: {
    value: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("number"), Object.assign(function (node, key, val) {
        if (1 / val < 0 || !Number.isFinite(val)) {
          const error = new Error("NumericLiterals must be non-negative finite numbers. " + `You can use t.valueToNode(${val}) instead.`);
          {}
        }
      }, {
        type: "number"
      }))
    }
  },
  aliases: ["Expression", "Pureish", "Literal", "Immutable"]
});
defineType("NullLiteral", {
  aliases: ["Expression", "Pureish", "Literal", "Immutable"]
});
defineType("BooleanLiteral", {
  builder: ["value"],
  fields: {
    value: {
      validate: (0, _utils.assertValueType)("boolean")
    }
  },
  aliases: ["Expression", "Pureish", "Literal", "Immutable"]
});
defineType("RegExpLiteral", {
  builder: ["pattern", "flags"],
  deprecatedAlias: "RegexLiteral",
  aliases: ["Expression", "Pureish", "Literal"],
  fields: {
    pattern: {
      validate: (0, _utils.assertValueType)("string")
    },
    flags: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("string"), Object.assign(function (node, key, val) {
        if (!process.env.BABEL_TYPES_8_BREAKING) return;
        const invalid = /[^gimsuy]/.exec(val);
        if (invalid) {
          throw new TypeError(`"${invalid[0]}" is not a valid RegExp flag`);
        }
      }, {
        type: "string"
      })),
      default: ""
    }
  }
});
defineType("LogicalExpression", {
  builder: ["operator", "left", "right"],
  visitor: ["left", "right"],
  aliases: ["Binary", "Expression"],
  fields: {
    operator: {
      validate: (0, _utils.assertOneOf)(..._index.LOGICAL_OPERATORS)
    },
    left: {
      validate: (0, _utils.assertNodeType)("Expression")
    },
    right: {
      validate: (0, _utils.assertNodeType)("Expression")
    }
  }
});
defineType("MemberExpression", {
  builder: ["object", "property", "computed", ...(!process.env.BABEL_TYPES_8_BREAKING ? ["optional"] : [])],
  visitor: ["object", "property"],
  aliases: ["Expression", "LVal"],
  fields: Object.assign({
    object: {
      validate: (0, _utils.assertNodeType)("Expression", "Super")
    },
    property: {
      validate: function () {
        const normal = (0, _utils.assertNodeType)("Identifier", "PrivateName");
        const computed = (0, _utils.assertNodeType)("Expression");
        const validator = function (node, key, val) {
          const validator = node.computed ? computed : normal;
          validator(node, key, val);
        };
        validator.oneOfNodeTypes = ["Expression", "Identifier", "PrivateName"];
        return validator;
      }()
    },
    computed: {
      default: false
    }
  }, !process.env.BABEL_TYPES_8_BREAKING ? {
    optional: {
      validate: (0, _utils.assertOneOf)(true, false),
      optional: true
    }
  } : {})
});
defineType("NewExpression", {
  inherits: "CallExpression"
});
defineType("Program", {
  visitor: ["directives", "body"],
  builder: ["body", "directives", "sourceType", "interpreter"],
  fields: {
    sourceFile: {
      validate: (0, _utils.assertValueType)("string")
    },
    sourceType: {
      validate: (0, _utils.assertOneOf)("script", "module"),
      default: "script"
    },
    interpreter: {
      validate: (0, _utils.assertNodeType)("InterpreterDirective"),
      default: null,
      optional: true
    },
    directives: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("Directive"))),
      default: []
    },
    body: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("Statement")))
    }
  },
  aliases: ["Scopable", "BlockParent", "Block"]
});
defineType("ObjectExpression", {
  visitor: ["properties"],
  aliases: ["Expression"],
  fields: {
    properties: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("ObjectMethod", "ObjectProperty", "SpreadElement")))
    }
  }
});
defineType("ObjectMethod", {
  builder: ["kind", "key", "params", "body", "computed", "generator", "async"],
  fields: Object.assign({}, functionCommon(), functionTypeAnnotationCommon(), {
    kind: Object.assign({
      validate: (0, _utils.assertOneOf)("method", "get", "set")
    }, !process.env.BABEL_TYPES_8_BREAKING ? {
      default: "method"
    } : {}),
    computed: {
      default: false
    },
    key: {
      validate: function () {
        const normal = (0, _utils.assertNodeType)("Identifier", "StringLiteral", "NumericLiteral", "BigIntLiteral");
        const computed = (0, _utils.assertNodeType)("Expression");
        const validator = function (node, key, val) {
          const validator = node.computed ? computed : normal;
          validator(node, key, val);
        };
        validator.oneOfNodeTypes = ["Expression", "Identifier", "StringLiteral", "NumericLiteral", "BigIntLiteral"];
        return validator;
      }()
    },
    decorators: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("Decorator"))),
      optional: true
    },
    body: {
      validate: (0, _utils.assertNodeType)("BlockStatement")
    }
  }),
  visitor: ["key", "params", "body", "decorators", "returnType", "typeParameters"],
  aliases: ["UserWhitespacable", "Function", "Scopable", "BlockParent", "FunctionParent", "Method", "ObjectMember"]
});
defineType("ObjectProperty", {
  builder: ["key", "value", "computed", "shorthand", ...(!process.env.BABEL_TYPES_8_BREAKING ? ["decorators"] : [])],
  fields: {
    computed: {
      default: false
    },
    key: {
      validate: function () {
        const normal = (0, _utils.assertNodeType)("Identifier", "StringLiteral", "NumericLiteral", "BigIntLiteral", "DecimalLiteral", "PrivateName");
        const computed = (0, _utils.assertNodeType)("Expression");
        const validator = Object.assign(function (node, key, val) {
          const validator = node.computed ? computed : normal;
          validator(node, key, val);
        }, {
          oneOfNodeTypes: ["Expression", "Identifier", "StringLiteral", "NumericLiteral", "BigIntLiteral", "DecimalLiteral", "PrivateName"]
        });
        return validator;
      }()
    },
    value: {
      validate: (0, _utils.assertNodeType)("Expression", "PatternLike")
    },
    shorthand: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("boolean"), Object.assign(function (node, key, val) {
        if (!process.env.BABEL_TYPES_8_BREAKING) return;
        if (val && node.computed) {
          throw new TypeError("Property shorthand of ObjectProperty cannot be true if computed is true");
        }
      }, {
        type: "boolean"
      }), function (node, key, val) {
        if (!process.env.BABEL_TYPES_8_BREAKING) return;
        if (val && !(0, _is.default)("Identifier", node.key)) {
          throw new TypeError("Property shorthand of ObjectProperty cannot be true if key is not an Identifier");
        }
      }),
      default: false
    },
    decorators: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("Decorator"))),
      optional: true
    }
  },
  visitor: ["key", "value", "decorators"],
  aliases: ["UserWhitespacable", "Property", "ObjectMember"],
  validate: function () {
    const pattern = (0, _utils.assertNodeType)("Identifier", "Pattern", "TSAsExpression", "TSSatisfiesExpression", "TSNonNullExpression", "TSTypeAssertion");
    const expression = (0, _utils.assertNodeType)("Expression");
    return function (parent, key, node) {
      if (!process.env.BABEL_TYPES_8_BREAKING) return;
      const validator = (0, _is.default)("ObjectPattern", parent) ? pattern : expression;
      validator(node, "value", node.value);
    };
  }()
});
defineType("RestElement", {
  visitor: ["argument", "typeAnnotation"],
  builder: ["argument"],
  aliases: ["LVal", "PatternLike"],
  deprecatedAlias: "RestProperty",
  fields: Object.assign({}, patternLikeCommon(), {
    argument: {
      validate: !process.env.BABEL_TYPES_8_BREAKING ? (0, _utils.assertNodeType)("LVal") : (0, _utils.assertNodeType)("Identifier", "ArrayPattern", "ObjectPattern", "MemberExpression", "TSAsExpression", "TSSatisfiesExpression", "TSTypeAssertion", "TSNonNullExpression")
    }
  }),
  validate(parent, key) {
    if (!process.env.BABEL_TYPES_8_BREAKING) return;
    const match = /(\w+)\[(\d+)\]/.exec(key);
    if (!match) throw new Error("Internal Babel error: malformed key.");
    const [, listKey, index] = match;
    if (parent[listKey].length > +index + 1) {
      throw new TypeError(`RestElement must be last element of ${listKey}`);
    }
  }
});
defineType("ReturnStatement", {
  visitor: ["argument"],
  aliases: ["Statement", "Terminatorless", "CompletionStatement"],
  fields: {
    argument: {
      validate: (0, _utils.assertNodeType)("Expression"),
      optional: true
    }
  }
});
defineType("SequenceExpression", {
  visitor: ["expressions"],
  fields: {
    expressions: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("Expression")))
    }
  },
  aliases: ["Expression"]
});
defineType("ParenthesizedExpression", {
  visitor: ["expression"],
  aliases: ["Expression", "ExpressionWrapper"],
  fields: {
    expression: {
      validate: (0, _utils.assertNodeType)("Expression")
    }
  }
});
defineType("SwitchCase", {
  visitor: ["test", "consequent"],
  fields: {
    test: {
      validate: (0, _utils.assertNodeType)("Expression"),
      optional: true
    },
    consequent: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("Statement")))
    }
  }
});
defineType("SwitchStatement", {
  visitor: ["discriminant", "cases"],
  aliases: ["Statement", "BlockParent", "Scopable"],
  fields: {
    discriminant: {
      validate: (0, _utils.assertNodeType)("Expression")
    },
    cases: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("SwitchCase")))
    }
  }
});
defineType("ThisExpression", {
  aliases: ["Expression"]
});
defineType("ThrowStatement", {
  visitor: ["argument"],
  aliases: ["Statement", "Terminatorless", "CompletionStatement"],
  fields: {
    argument: {
      validate: (0, _utils.assertNodeType)("Expression")
    }
  }
});
defineType("TryStatement", {
  visitor: ["block", "handler", "finalizer"],
  aliases: ["Statement"],
  fields: {
    block: {
      validate: (0, _utils.chain)((0, _utils.assertNodeType)("BlockStatement"), Object.assign(function (node) {
        if (!process.env.BABEL_TYPES_8_BREAKING) return;
        if (!node.handler && !node.finalizer) {
          throw new TypeError("TryStatement expects either a handler or finalizer, or both");
        }
      }, {
        oneOfNodeTypes: ["BlockStatement"]
      }))
    },
    handler: {
      optional: true,
      validate: (0, _utils.assertNodeType)("CatchClause")
    },
    finalizer: {
      optional: true,
      validate: (0, _utils.assertNodeType)("BlockStatement")
    }
  }
});
defineType("UnaryExpression", {
  builder: ["operator", "argument", "prefix"],
  fields: {
    prefix: {
      default: true
    },
    argument: {
      validate: (0, _utils.assertNodeType)("Expression")
    },
    operator: {
      validate: (0, _utils.assertOneOf)(..._index.UNARY_OPERATORS)
    }
  },
  visitor: ["argument"],
  aliases: ["UnaryLike", "Expression"]
});
defineType("UpdateExpression", {
  builder: ["operator", "argument", "prefix"],
  fields: {
    prefix: {
      default: false
    },
    argument: {
      validate: !process.env.BABEL_TYPES_8_BREAKING ? (0, _utils.assertNodeType)("Expression") : (0, _utils.assertNodeType)("Identifier", "MemberExpression")
    },
    operator: {
      validate: (0, _utils.assertOneOf)(..._index.UPDATE_OPERATORS)
    }
  },
  visitor: ["argument"],
  aliases: ["Expression"]
});
defineType("VariableDeclaration", {
  builder: ["kind", "declarations"],
  visitor: ["declarations"],
  aliases: ["Statement", "Declaration"],
  fields: {
    declare: {
      validate: (0, _utils.assertValueType)("boolean"),
      optional: true
    },
    kind: {
      validate: (0, _utils.assertOneOf)("var", "let", "const", "using", "await using")
    },
    declarations: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("VariableDeclarator")))
    }
  },
  validate(parent, key, node) {
    if (!process.env.BABEL_TYPES_8_BREAKING) return;
    if (!(0, _is.default)("ForXStatement", parent, {
      left: node
    })) return;
    if (node.declarations.length !== 1) {
      throw new TypeError(`Exactly one VariableDeclarator is required in the VariableDeclaration of a ${parent.type}`);
    }
  }
});
defineType("VariableDeclarator", {
  visitor: ["id", "init"],
  fields: {
    id: {
      validate: function () {
        if (!process.env.BABEL_TYPES_8_BREAKING) {
          return (0, _utils.assertNodeType)("LVal");
        }
        const normal = (0, _utils.assertNodeType)("Identifier", "ArrayPattern", "ObjectPattern");
        const without = (0, _utils.assertNodeType)("Identifier");
        return function (node, key, val) {
          const validator = node.init ? normal : without;
          validator(node, key, val);
        };
      }()
    },
    definite: {
      optional: true,
      validate: (0, _utils.assertValueType)("boolean")
    },
    init: {
      optional: true,
      validate: (0, _utils.assertNodeType)("Expression")
    }
  }
});
defineType("WhileStatement", {
  visitor: ["test", "body"],
  aliases: ["Statement", "BlockParent", "Loop", "While", "Scopable"],
  fields: {
    test: {
      validate: (0, _utils.assertNodeType)("Expression")
    },
    body: {
      validate: (0, _utils.assertNodeType)("Statement")
    }
  }
});
defineType("WithStatement", {
  visitor: ["object", "body"],
  aliases: ["Statement"],
  fields: {
    object: {
      validate: (0, _utils.assertNodeType)("Expression")
    },
    body: {
      validate: (0, _utils.assertNodeType)("Statement")
    }
  }
});
defineType("AssignmentPattern", {
  visitor: ["left", "right", "decorators"],
  builder: ["left", "right"],
  aliases: ["Pattern", "PatternLike", "LVal"],
  fields: Object.assign({}, patternLikeCommon(), {
    left: {
      validate: (0, _utils.assertNodeType)("Identifier", "ObjectPattern", "ArrayPattern", "MemberExpression", "TSAsExpression", "TSSatisfiesExpression", "TSTypeAssertion", "TSNonNullExpression")
    },
    right: {
      validate: (0, _utils.assertNodeType)("Expression")
    },
    decorators: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("Decorator"))),
      optional: true
    }
  })
});
defineType("ArrayPattern", {
  visitor: ["elements", "typeAnnotation"],
  builder: ["elements"],
  aliases: ["Pattern", "PatternLike", "LVal"],
  fields: Object.assign({}, patternLikeCommon(), {
    elements: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeOrValueType)("null", "PatternLike", "LVal")))
    }
  })
});
defineType("ArrowFunctionExpression", {
  builder: ["params", "body", "async"],
  visitor: ["params", "body", "returnType", "typeParameters"],
  aliases: ["Scopable", "Function", "BlockParent", "FunctionParent", "Expression", "Pureish"],
  fields: Object.assign({}, functionCommon(), functionTypeAnnotationCommon(), {
    expression: {
      validate: (0, _utils.assertValueType)("boolean")
    },
    body: {
      validate: (0, _utils.assertNodeType)("BlockStatement", "Expression")
    },
    predicate: {
      validate: (0, _utils.assertNodeType)("DeclaredPredicate", "InferredPredicate"),
      optional: true
    }
  })
});
defineType("ClassBody", {
  visitor: ["body"],
  fields: {
    body: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("ClassMethod", "ClassPrivateMethod", "ClassProperty", "ClassPrivateProperty", "ClassAccessorProperty", "TSDeclareMethod", "TSIndexSignature", "StaticBlock")))
    }
  }
});
defineType("ClassExpression", {
  builder: ["id", "superClass", "body", "decorators"],
  visitor: ["id", "body", "superClass", "mixins", "typeParameters", "superTypeParameters", "implements", "decorators"],
  aliases: ["Scopable", "Class", "Expression"],
  fields: {
    id: {
      validate: (0, _utils.assertNodeType)("Identifier"),
      optional: true
    },
    typeParameters: {
      validate: (0, _utils.assertNodeType)("TypeParameterDeclaration", "TSTypeParameterDeclaration", "Noop"),
      optional: true
    },
    body: {
      validate: (0, _utils.assertNodeType)("ClassBody")
    },
    superClass: {
      optional: true,
      validate: (0, _utils.assertNodeType)("Expression")
    },
    superTypeParameters: {
      validate: (0, _utils.assertNodeType)("TypeParameterInstantiation", "TSTypeParameterInstantiation"),
      optional: true
    },
    implements: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("TSExpressionWithTypeArguments", "ClassImplements"))),
      optional: true
    },
    decorators: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("Decorator"))),
      optional: true
    },
    mixins: {
      validate: (0, _utils.assertNodeType)("InterfaceExtends"),
      optional: true
    }
  }
});
defineType("ClassDeclaration", {
  inherits: "ClassExpression",
  aliases: ["Scopable", "Class", "Statement", "Declaration"],
  fields: {
    id: {
      validate: (0, _utils.assertNodeType)("Identifier"),
      optional: true
    },
    typeParameters: {
      validate: (0, _utils.assertNodeType)("TypeParameterDeclaration", "TSTypeParameterDeclaration", "Noop"),
      optional: true
    },
    body: {
      validate: (0, _utils.assertNodeType)("ClassBody")
    },
    superClass: {
      optional: true,
      validate: (0, _utils.assertNodeType)("Expression")
    },
    superTypeParameters: {
      validate: (0, _utils.assertNodeType)("TypeParameterInstantiation", "TSTypeParameterInstantiation"),
      optional: true
    },
    implements: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("TSExpressionWithTypeArguments", "ClassImplements"))),
      optional: true
    },
    decorators: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("Decorator"))),
      optional: true
    },
    mixins: {
      validate: (0, _utils.assertNodeType)("InterfaceExtends"),
      optional: true
    },
    declare: {
      validate: (0, _utils.assertValueType)("boolean"),
      optional: true
    },
    abstract: {
      validate: (0, _utils.assertValueType)("boolean"),
      optional: true
    }
  },
  validate: function () {
    const identifier = (0, _utils.assertNodeType)("Identifier");
    return function (parent, key, node) {
      if (!process.env.BABEL_TYPES_8_BREAKING) return;
      if (!(0, _is.default)("ExportDefaultDeclaration", parent)) {
        identifier(node, "id", node.id);
      }
    };
  }()
});
defineType("ExportAllDeclaration", {
  builder: ["source"],
  visitor: ["source", "attributes", "assertions"],
  aliases: ["Statement", "Declaration", "ImportOrExportDeclaration", "ExportDeclaration"],
  fields: {
    source: {
      validate: (0, _utils.assertNodeType)("StringLiteral")
    },
    exportKind: (0, _utils.validateOptional)((0, _utils.assertOneOf)("type", "value")),
    attributes: {
      optional: true,
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("ImportAttribute")))
    },
    assertions: {
      optional: true,
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("ImportAttribute")))
    }
  }
});
defineType("ExportDefaultDeclaration", {
  visitor: ["declaration"],
  aliases: ["Statement", "Declaration", "ImportOrExportDeclaration", "ExportDeclaration"],
  fields: {
    declaration: {
      validate: (0, _utils.assertNodeType)("TSDeclareFunction", "FunctionDeclaration", "ClassDeclaration", "Expression")
    },
    exportKind: (0, _utils.validateOptional)((0, _utils.assertOneOf)("value"))
  }
});
defineType("ExportNamedDeclaration", {
  builder: ["declaration", "specifiers", "source"],
  visitor: ["declaration", "specifiers", "source", "attributes", "assertions"],
  aliases: ["Statement", "Declaration", "ImportOrExportDeclaration", "ExportDeclaration"],
  fields: {
    declaration: {
      optional: true,
      validate: (0, _utils.chain)((0, _utils.assertNodeType)("Declaration"), Object.assign(function (node, key, val) {
        if (!process.env.BABEL_TYPES_8_BREAKING) return;
        if (val && node.specifiers.length) {
          throw new TypeError("Only declaration or specifiers is allowed on ExportNamedDeclaration");
        }
      }, {
        oneOfNodeTypes: ["Declaration"]
      }), function (node, key, val) {
        if (!process.env.BABEL_TYPES_8_BREAKING) return;
        if (val && node.source) {
          throw new TypeError("Cannot export a declaration from a source");
        }
      })
    },
    attributes: {
      optional: true,
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("ImportAttribute")))
    },
    assertions: {
      optional: true,
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("ImportAttribute")))
    },
    specifiers: {
      default: [],
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)(function () {
        const sourced = (0, _utils.assertNodeType)("ExportSpecifier", "ExportDefaultSpecifier", "ExportNamespaceSpecifier");
        const sourceless = (0, _utils.assertNodeType)("ExportSpecifier");
        if (!process.env.BABEL_TYPES_8_BREAKING) return sourced;
        return function (node, key, val) {
          const validator = node.source ? sourced : sourceless;
          validator(node, key, val);
        };
      }()))
    },
    source: {
      validate: (0, _utils.assertNodeType)("StringLiteral"),
      optional: true
    },
    exportKind: (0, _utils.validateOptional)((0, _utils.assertOneOf)("type", "value"))
  }
});
defineType("ExportSpecifier", {
  visitor: ["local", "exported"],
  aliases: ["ModuleSpecifier"],
  fields: {
    local: {
      validate: (0, _utils.assertNodeType)("Identifier")
    },
    exported: {
      validate: (0, _utils.assertNodeType)("Identifier", "StringLiteral")
    },
    exportKind: {
      validate: (0, _utils.assertOneOf)("type", "value"),
      optional: true
    }
  }
});
defineType("ForOfStatement", {
  visitor: ["left", "right", "body"],
  builder: ["left", "right", "body", "await"],
  aliases: ["Scopable", "Statement", "For", "BlockParent", "Loop", "ForXStatement"],
  fields: {
    left: {
      validate: function () {
        if (!process.env.BABEL_TYPES_8_BREAKING) {
          return (0, _utils.assertNodeType)("VariableDeclaration", "LVal");
        }
        const declaration = (0, _utils.assertNodeType)("VariableDeclaration");
        const lval = (0, _utils.assertNodeType)("Identifier", "MemberExpression", "ArrayPattern", "ObjectPattern", "TSAsExpression", "TSSatisfiesExpression", "TSTypeAssertion", "TSNonNullExpression");
        return function (node, key, val) {
          if ((0, _is.default)("VariableDeclaration", val)) {
            declaration(node, key, val);
          } else {
            lval(node, key, val);
          }
        };
      }()
    },
    right: {
      validate: (0, _utils.assertNodeType)("Expression")
    },
    body: {
      validate: (0, _utils.assertNodeType)("Statement")
    },
    await: {
      default: false
    }
  }
});
defineType("ImportDeclaration", {
  builder: ["specifiers", "source"],
  visitor: ["specifiers", "source", "attributes", "assertions"],
  aliases: ["Statement", "Declaration", "ImportOrExportDeclaration"],
  fields: {
    attributes: {
      optional: true,
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("ImportAttribute")))
    },
    assertions: {
      optional: true,
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("ImportAttribute")))
    },
    module: {
      optional: true,
      validate: (0, _utils.assertValueType)("boolean")
    },
    phase: {
      default: null,
      validate: (0, _utils.assertOneOf)("source", "defer")
    },
    specifiers: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("ImportSpecifier", "ImportDefaultSpecifier", "ImportNamespaceSpecifier")))
    },
    source: {
      validate: (0, _utils.assertNodeType)("StringLiteral")
    },
    importKind: {
      validate: (0, _utils.assertOneOf)("type", "typeof", "value"),
      optional: true
    }
  }
});
defineType("ImportDefaultSpecifier", {
  visitor: ["local"],
  aliases: ["ModuleSpecifier"],
  fields: {
    local: {
      validate: (0, _utils.assertNodeType)("Identifier")
    }
  }
});
defineType("ImportNamespaceSpecifier", {
  visitor: ["local"],
  aliases: ["ModuleSpecifier"],
  fields: {
    local: {
      validate: (0, _utils.assertNodeType)("Identifier")
    }
  }
});
defineType("ImportSpecifier", {
  visitor: ["local", "imported"],
  aliases: ["ModuleSpecifier"],
  fields: {
    local: {
      validate: (0, _utils.assertNodeType)("Identifier")
    },
    imported: {
      validate: (0, _utils.assertNodeType)("Identifier", "StringLiteral")
    },
    importKind: {
      validate: (0, _utils.assertOneOf)("type", "typeof", "value"),
      optional: true
    }
  }
});
defineType("ImportExpression", {
  visitor: ["source", "options"],
  aliases: ["Expression"],
  fields: {
    phase: {
      default: null,
      validate: (0, _utils.assertOneOf)("source", "defer")
    },
    source: {
      validate: (0, _utils.assertNodeType)("Expression")
    },
    options: {
      validate: (0, _utils.assertNodeType)("Expression"),
      optional: true
    }
  }
});
defineType("MetaProperty", {
  visitor: ["meta", "property"],
  aliases: ["Expression"],
  fields: {
    meta: {
      validate: (0, _utils.chain)((0, _utils.assertNodeType)("Identifier"), Object.assign(function (node, key, val) {
        if (!process.env.BABEL_TYPES_8_BREAKING) return;
        let property;
        switch (val.name) {
          case "function":
            property = "sent";
            break;
          case "new":
            property = "target";
            break;
          case "import":
            property = "meta";
            break;
        }
        if (!(0, _is.default)("Identifier", node.property, {
          name: property
        })) {
          throw new TypeError("Unrecognised MetaProperty");
        }
      }, {
        oneOfNodeTypes: ["Identifier"]
      }))
    },
    property: {
      validate: (0, _utils.assertNodeType)("Identifier")
    }
  }
});
const classMethodOrPropertyCommon = () => ({
  abstract: {
    validate: (0, _utils.assertValueType)("boolean"),
    optional: true
  },
  accessibility: {
    validate: (0, _utils.assertOneOf)("public", "private", "protected"),
    optional: true
  },
  static: {
    default: false
  },
  override: {
    default: false
  },
  computed: {
    default: false
  },
  optional: {
    validate: (0, _utils.assertValueType)("boolean"),
    optional: true
  },
  key: {
    validate: (0, _utils.chain)(function () {
      const normal = (0, _utils.assertNodeType)("Identifier", "StringLiteral", "NumericLiteral");
      const computed = (0, _utils.assertNodeType)("Expression");
      return function (node, key, val) {
        const validator = node.computed ? computed : normal;
        validator(node, key, val);
      };
    }(), (0, _utils.assertNodeType)("Identifier", "StringLiteral", "NumericLiteral", "BigIntLiteral", "Expression"))
  }
});
exports.classMethodOrPropertyCommon = classMethodOrPropertyCommon;
const classMethodOrDeclareMethodCommon = () => Object.assign({}, functionCommon(), classMethodOrPropertyCommon(), {
  params: {
    validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("Identifier", "Pattern", "RestElement", "TSParameterProperty")))
  },
  kind: {
    validate: (0, _utils.assertOneOf)("get", "set", "method", "constructor"),
    default: "method"
  },
  access: {
    validate: (0, _utils.chain)((0, _utils.assertValueType)("string"), (0, _utils.assertOneOf)("public", "private", "protected")),
    optional: true
  },
  decorators: {
    validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("Decorator"))),
    optional: true
  }
});
exports.classMethodOrDeclareMethodCommon = classMethodOrDeclareMethodCommon;
defineType("ClassMethod", {
  aliases: ["Function", "Scopable", "BlockParent", "FunctionParent", "Method"],
  builder: ["kind", "key", "params", "body", "computed", "static", "generator", "async"],
  visitor: ["key", "params", "body", "decorators", "returnType", "typeParameters"],
  fields: Object.assign({}, classMethodOrDeclareMethodCommon(), functionTypeAnnotationCommon(), {
    body: {
      validate: (0, _utils.assertNodeType)("BlockStatement")
    }
  })
});
defineType("ObjectPattern", {
  visitor: ["properties", "typeAnnotation", "decorators"],
  builder: ["properties"],
  aliases: ["Pattern", "PatternLike", "LVal"],
  fields: Object.assign({}, patternLikeCommon(), {
    properties: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("RestElement", "ObjectProperty")))
    }
  })
});
defineType("SpreadElement", {
  visitor: ["argument"],
  aliases: ["UnaryLike"],
  deprecatedAlias: "SpreadProperty",
  fields: {
    argument: {
      validate: (0, _utils.assertNodeType)("Expression")
    }
  }
});
defineType("Super", {
  aliases: ["Expression"]
});
defineType("TaggedTemplateExpression", {
  visitor: ["tag", "quasi", "typeParameters"],
  builder: ["tag", "quasi"],
  aliases: ["Expression"],
  fields: {
    tag: {
      validate: (0, _utils.assertNodeType)("Expression")
    },
    quasi: {
      validate: (0, _utils.assertNodeType)("TemplateLiteral")
    },
    typeParameters: {
      validate: (0, _utils.assertNodeType)("TypeParameterInstantiation", "TSTypeParameterInstantiation"),
      optional: true
    }
  }
});
defineType("TemplateElement", {
  builder: ["value", "tail"],
  fields: {
    value: {
      validate: (0, _utils.chain)((0, _utils.assertShape)({
        raw: {
          validate: (0, _utils.assertValueType)("string")
        },
        cooked: {
          validate: (0, _utils.assertValueType)("string"),
          optional: true
        }
      }), function templateElementCookedValidator(node) {
        const raw = node.value.raw;
        let unterminatedCalled = false;
        const error = () => {
          throw new Error("Internal @babel/types error.");
        };
        const {
          str,
          firstInvalidLoc
        } = (0, _helperStringParser.readStringContents)("template", raw, 0, 0, 0, {
          unterminated() {
            unterminatedCalled = true;
          },
          strictNumericEscape: error,
          invalidEscapeSequence: error,
          numericSeparatorInEscapeSequence: error,
          unexpectedNumericSeparator: error,
          invalidDigit: error,
          invalidCodePoint: error
        });
        if (!unterminatedCalled) throw new Error("Invalid raw");
        node.value.cooked = firstInvalidLoc ? null : str;
      })
    },
    tail: {
      default: false
    }
  }
});
defineType("TemplateLiteral", {
  visitor: ["quasis", "expressions"],
  aliases: ["Expression", "Literal"],
  fields: {
    quasis: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("TemplateElement")))
    },
    expressions: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("Expression", "TSType")), function (node, key, val) {
        if (node.quasis.length !== val.length + 1) {
          throw new TypeError(`Number of ${node.type} quasis should be exactly one more than the number of expressions.\nExpected ${val.length + 1} quasis but got ${node.quasis.length}`);
        }
      })
    }
  }
});
defineType("YieldExpression", {
  builder: ["argument", "delegate"],
  visitor: ["argument"],
  aliases: ["Expression", "Terminatorless"],
  fields: {
    delegate: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("boolean"), Object.assign(function (node, key, val) {
        if (!process.env.BABEL_TYPES_8_BREAKING) return;
        if (val && !node.argument) {
          throw new TypeError("Property delegate of YieldExpression cannot be true if there is no argument");
        }
      }, {
        type: "boolean"
      })),
      default: false
    },
    argument: {
      optional: true,
      validate: (0, _utils.assertNodeType)("Expression")
    }
  }
});
defineType("AwaitExpression", {
  builder: ["argument"],
  visitor: ["argument"],
  aliases: ["Expression", "Terminatorless"],
  fields: {
    argument: {
      validate: (0, _utils.assertNodeType)("Expression")
    }
  }
});
defineType("Import", {
  aliases: ["Expression"]
});
defineType("BigIntLiteral", {
  builder: ["value"],
  fields: {
    value: {
      validate: (0, _utils.assertValueType)("string")
    }
  },
  aliases: ["Expression", "Pureish", "Literal", "Immutable"]
});
defineType("ExportNamespaceSpecifier", {
  visitor: ["exported"],
  aliases: ["ModuleSpecifier"],
  fields: {
    exported: {
      validate: (0, _utils.assertNodeType)("Identifier")
    }
  }
});
defineType("OptionalMemberExpression", {
  builder: ["object", "property", "computed", "optional"],
  visitor: ["object", "property"],
  aliases: ["Expression"],
  fields: {
    object: {
      validate: (0, _utils.assertNodeType)("Expression")
    },
    property: {
      validate: function () {
        const normal = (0, _utils.assertNodeType)("Identifier");
        const computed = (0, _utils.assertNodeType)("Expression");
        const validator = Object.assign(function (node, key, val) {
          const validator = node.computed ? computed : normal;
          validator(node, key, val);
        }, {
          oneOfNodeTypes: ["Expression", "Identifier"]
        });
        return validator;
      }()
    },
    computed: {
      default: false
    },
    optional: {
      validate: !process.env.BABEL_TYPES_8_BREAKING ? (0, _utils.assertValueType)("boolean") : (0, _utils.chain)((0, _utils.assertValueType)("boolean"), (0, _utils.assertOptionalChainStart)())
    }
  }
});
defineType("OptionalCallExpression", {
  visitor: ["callee", "arguments", "typeParameters", "typeArguments"],
  builder: ["callee", "arguments", "optional"],
  aliases: ["Expression"],
  fields: {
    callee: {
      validate: (0, _utils.assertNodeType)("Expression")
    },
    arguments: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("Expression", "SpreadElement", "JSXNamespacedName", "ArgumentPlaceholder")))
    },
    optional: {
      validate: !process.env.BABEL_TYPES_8_BREAKING ? (0, _utils.assertValueType)("boolean") : (0, _utils.chain)((0, _utils.assertValueType)("boolean"), (0, _utils.assertOptionalChainStart)())
    },
    typeArguments: {
      validate: (0, _utils.assertNodeType)("TypeParameterInstantiation"),
      optional: true
    },
    typeParameters: {
      validate: (0, _utils.assertNodeType)("TSTypeParameterInstantiation"),
      optional: true
    }
  }
});
defineType("ClassProperty", {
  visitor: ["key", "value", "typeAnnotation", "decorators"],
  builder: ["key", "value", "typeAnnotation", "decorators", "computed", "static"],
  aliases: ["Property"],
  fields: Object.assign({}, classMethodOrPropertyCommon(), {
    value: {
      validate: (0, _utils.assertNodeType)("Expression"),
      optional: true
    },
    definite: {
      validate: (0, _utils.assertValueType)("boolean"),
      optional: true
    },
    typeAnnotation: {
      validate: (0, _utils.assertNodeType)("TypeAnnotation", "TSTypeAnnotation", "Noop"),
      optional: true
    },
    decorators: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("Decorator"))),
      optional: true
    },
    readonly: {
      validate: (0, _utils.assertValueType)("boolean"),
      optional: true
    },
    declare: {
      validate: (0, _utils.assertValueType)("boolean"),
      optional: true
    },
    variance: {
      validate: (0, _utils.assertNodeType)("Variance"),
      optional: true
    }
  })
});
defineType("ClassAccessorProperty", {
  visitor: ["key", "value", "typeAnnotation", "decorators"],
  builder: ["key", "value", "typeAnnotation", "decorators", "computed", "static"],
  aliases: ["Property", "Accessor"],
  fields: Object.assign({}, classMethodOrPropertyCommon(), {
    key: {
      validate: (0, _utils.chain)(function () {
        const normal = (0, _utils.assertNodeType)("Identifier", "StringLiteral", "NumericLiteral", "BigIntLiteral", "PrivateName");
        const computed = (0, _utils.assertNodeType)("Expression");
        return function (node, key, val) {
          const validator = node.computed ? computed : normal;
          validator(node, key, val);
        };
      }(), (0, _utils.assertNodeType)("Identifier", "StringLiteral", "NumericLiteral", "BigIntLiteral", "Expression", "PrivateName"))
    },
    value: {
      validate: (0, _utils.assertNodeType)("Expression"),
      optional: true
    },
    definite: {
      validate: (0, _utils.assertValueType)("boolean"),
      optional: true
    },
    typeAnnotation: {
      validate: (0, _utils.assertNodeType)("TypeAnnotation", "TSTypeAnnotation", "Noop"),
      optional: true
    },
    decorators: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("Decorator"))),
      optional: true
    },
    readonly: {
      validate: (0, _utils.assertValueType)("boolean"),
      optional: true
    },
    declare: {
      validate: (0, _utils.assertValueType)("boolean"),
      optional: true
    },
    variance: {
      validate: (0, _utils.assertNodeType)("Variance"),
      optional: true
    }
  })
});
defineType("ClassPrivateProperty", {
  visitor: ["key", "value", "decorators", "typeAnnotation"],
  builder: ["key", "value", "decorators", "static"],
  aliases: ["Property", "Private"],
  fields: {
    key: {
      validate: (0, _utils.assertNodeType)("PrivateName")
    },
    value: {
      validate: (0, _utils.assertNodeType)("Expression"),
      optional: true
    },
    typeAnnotation: {
      validate: (0, _utils.assertNodeType)("TypeAnnotation", "TSTypeAnnotation", "Noop"),
      optional: true
    },
    decorators: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("Decorator"))),
      optional: true
    },
    static: {
      validate: (0, _utils.assertValueType)("boolean"),
      default: false
    },
    readonly: {
      validate: (0, _utils.assertValueType)("boolean"),
      optional: true
    },
    definite: {
      validate: (0, _utils.assertValueType)("boolean"),
      optional: true
    },
    variance: {
      validate: (0, _utils.assertNodeType)("Variance"),
      optional: true
    }
  }
});
defineType("ClassPrivateMethod", {
  builder: ["kind", "key", "params", "body", "static"],
  visitor: ["key", "params", "body", "decorators", "returnType", "typeParameters"],
  aliases: ["Function", "Scopable", "BlockParent", "FunctionParent", "Method", "Private"],
  fields: Object.assign({}, classMethodOrDeclareMethodCommon(), functionTypeAnnotationCommon(), {
    kind: {
      validate: (0, _utils.assertOneOf)("get", "set", "method"),
      default: "method"
    },
    key: {
      validate: (0, _utils.assertNodeType)("PrivateName")
    },
    body: {
      validate: (0, _utils.assertNodeType)("BlockStatement")
    }
  })
});
defineType("PrivateName", {
  visitor: ["id"],
  aliases: ["Private"],
  fields: {
    id: {
      validate: (0, _utils.assertNodeType)("Identifier")
    }
  }
});
defineType("StaticBlock", {
  visitor: ["body"],
  fields: {
    body: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("Statement")))
    }
  },
  aliases: ["Scopable", "BlockParent", "FunctionParent"]
});



}).call(this)}).call(this,require('_process'))
},{"../constants/index.js":47,"../validators/is.js":87,"../validators/isValidIdentifier.js":100,"./utils.js":68,"@babel/helper-string-parser":20,"@babel/helper-validator-identifier":22,"_process":116}],60:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DEPRECATED_ALIASES = void 0;
const DEPRECATED_ALIASES = exports.DEPRECATED_ALIASES = {
  ModuleDeclaration: "ImportOrExportDeclaration"
};



},{}],61:[function(require,module,exports){
(function (process){(function (){
"use strict";

var _utils = require("./utils.js");
(0, _utils.default)("ArgumentPlaceholder", {});
(0, _utils.default)("BindExpression", {
  visitor: ["object", "callee"],
  aliases: ["Expression"],
  fields: !process.env.BABEL_TYPES_8_BREAKING ? {
    object: {
      validate: Object.assign(() => {}, {
        oneOfNodeTypes: ["Expression"]
      })
    },
    callee: {
      validate: Object.assign(() => {}, {
        oneOfNodeTypes: ["Expression"]
      })
    }
  } : {
    object: {
      validate: (0, _utils.assertNodeType)("Expression")
    },
    callee: {
      validate: (0, _utils.assertNodeType)("Expression")
    }
  }
});
(0, _utils.default)("ImportAttribute", {
  visitor: ["key", "value"],
  fields: {
    key: {
      validate: (0, _utils.assertNodeType)("Identifier", "StringLiteral")
    },
    value: {
      validate: (0, _utils.assertNodeType)("StringLiteral")
    }
  }
});
(0, _utils.default)("Decorator", {
  visitor: ["expression"],
  fields: {
    expression: {
      validate: (0, _utils.assertNodeType)("Expression")
    }
  }
});
(0, _utils.default)("DoExpression", {
  visitor: ["body"],
  builder: ["body", "async"],
  aliases: ["Expression"],
  fields: {
    body: {
      validate: (0, _utils.assertNodeType)("BlockStatement")
    },
    async: {
      validate: (0, _utils.assertValueType)("boolean"),
      default: false
    }
  }
});
(0, _utils.default)("ExportDefaultSpecifier", {
  visitor: ["exported"],
  aliases: ["ModuleSpecifier"],
  fields: {
    exported: {
      validate: (0, _utils.assertNodeType)("Identifier")
    }
  }
});
(0, _utils.default)("RecordExpression", {
  visitor: ["properties"],
  aliases: ["Expression"],
  fields: {
    properties: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("ObjectProperty", "SpreadElement")))
    }
  }
});
(0, _utils.default)("TupleExpression", {
  fields: {
    elements: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("Expression", "SpreadElement"))),
      default: []
    }
  },
  visitor: ["elements"],
  aliases: ["Expression"]
});
(0, _utils.default)("DecimalLiteral", {
  builder: ["value"],
  fields: {
    value: {
      validate: (0, _utils.assertValueType)("string")
    }
  },
  aliases: ["Expression", "Pureish", "Literal", "Immutable"]
});
(0, _utils.default)("ModuleExpression", {
  visitor: ["body"],
  fields: {
    body: {
      validate: (0, _utils.assertNodeType)("Program")
    }
  },
  aliases: ["Expression"]
});
(0, _utils.default)("TopicReference", {
  aliases: ["Expression"]
});
(0, _utils.default)("PipelineTopicExpression", {
  builder: ["expression"],
  visitor: ["expression"],
  fields: {
    expression: {
      validate: (0, _utils.assertNodeType)("Expression")
    }
  },
  aliases: ["Expression"]
});
(0, _utils.default)("PipelineBareFunction", {
  builder: ["callee"],
  visitor: ["callee"],
  fields: {
    callee: {
      validate: (0, _utils.assertNodeType)("Expression")
    }
  },
  aliases: ["Expression"]
});
(0, _utils.default)("PipelinePrimaryTopicReference", {
  aliases: ["Expression"]
});



}).call(this)}).call(this,require('_process'))
},{"./utils.js":68,"_process":116}],62:[function(require,module,exports){
"use strict";

var _utils = require("./utils.js");
const defineType = (0, _utils.defineAliasedType)("Flow");
const defineInterfaceishType = name => {
  const isDeclareClass = name === "DeclareClass";
  defineType(name, {
    builder: ["id", "typeParameters", "extends", "body"],
    visitor: ["id", "typeParameters", "extends", ...(isDeclareClass ? ["mixins", "implements"] : []), "body"],
    aliases: ["FlowDeclaration", "Statement", "Declaration"],
    fields: Object.assign({
      id: (0, _utils.validateType)("Identifier"),
      typeParameters: (0, _utils.validateOptionalType)("TypeParameterDeclaration"),
      extends: (0, _utils.validateOptional)((0, _utils.arrayOfType)("InterfaceExtends"))
    }, isDeclareClass ? {
      mixins: (0, _utils.validateOptional)((0, _utils.arrayOfType)("InterfaceExtends")),
      implements: (0, _utils.validateOptional)((0, _utils.arrayOfType)("ClassImplements"))
    } : {}, {
      body: (0, _utils.validateType)("ObjectTypeAnnotation")
    })
  });
};
defineType("AnyTypeAnnotation", {
  aliases: ["FlowType", "FlowBaseAnnotation"]
});
defineType("ArrayTypeAnnotation", {
  visitor: ["elementType"],
  aliases: ["FlowType"],
  fields: {
    elementType: (0, _utils.validateType)("FlowType")
  }
});
defineType("BooleanTypeAnnotation", {
  aliases: ["FlowType", "FlowBaseAnnotation"]
});
defineType("BooleanLiteralTypeAnnotation", {
  builder: ["value"],
  aliases: ["FlowType"],
  fields: {
    value: (0, _utils.validate)((0, _utils.assertValueType)("boolean"))
  }
});
defineType("NullLiteralTypeAnnotation", {
  aliases: ["FlowType", "FlowBaseAnnotation"]
});
defineType("ClassImplements", {
  visitor: ["id", "typeParameters"],
  fields: {
    id: (0, _utils.validateType)("Identifier"),
    typeParameters: (0, _utils.validateOptionalType)("TypeParameterInstantiation")
  }
});
defineInterfaceishType("DeclareClass");
defineType("DeclareFunction", {
  visitor: ["id"],
  aliases: ["FlowDeclaration", "Statement", "Declaration"],
  fields: {
    id: (0, _utils.validateType)("Identifier"),
    predicate: (0, _utils.validateOptionalType)("DeclaredPredicate")
  }
});
defineInterfaceishType("DeclareInterface");
defineType("DeclareModule", {
  builder: ["id", "body", "kind"],
  visitor: ["id", "body"],
  aliases: ["FlowDeclaration", "Statement", "Declaration"],
  fields: {
    id: (0, _utils.validateType)(["Identifier", "StringLiteral"]),
    body: (0, _utils.validateType)("BlockStatement"),
    kind: (0, _utils.validateOptional)((0, _utils.assertOneOf)("CommonJS", "ES"))
  }
});
defineType("DeclareModuleExports", {
  visitor: ["typeAnnotation"],
  aliases: ["FlowDeclaration", "Statement", "Declaration"],
  fields: {
    typeAnnotation: (0, _utils.validateType)("TypeAnnotation")
  }
});
defineType("DeclareTypeAlias", {
  visitor: ["id", "typeParameters", "right"],
  aliases: ["FlowDeclaration", "Statement", "Declaration"],
  fields: {
    id: (0, _utils.validateType)("Identifier"),
    typeParameters: (0, _utils.validateOptionalType)("TypeParameterDeclaration"),
    right: (0, _utils.validateType)("FlowType")
  }
});
defineType("DeclareOpaqueType", {
  visitor: ["id", "typeParameters", "supertype"],
  aliases: ["FlowDeclaration", "Statement", "Declaration"],
  fields: {
    id: (0, _utils.validateType)("Identifier"),
    typeParameters: (0, _utils.validateOptionalType)("TypeParameterDeclaration"),
    supertype: (0, _utils.validateOptionalType)("FlowType"),
    impltype: (0, _utils.validateOptionalType)("FlowType")
  }
});
defineType("DeclareVariable", {
  visitor: ["id"],
  aliases: ["FlowDeclaration", "Statement", "Declaration"],
  fields: {
    id: (0, _utils.validateType)("Identifier")
  }
});
defineType("DeclareExportDeclaration", {
  visitor: ["declaration", "specifiers", "source"],
  aliases: ["FlowDeclaration", "Statement", "Declaration"],
  fields: {
    declaration: (0, _utils.validateOptionalType)("Flow"),
    specifiers: (0, _utils.validateOptional)((0, _utils.arrayOfType)(["ExportSpecifier", "ExportNamespaceSpecifier"])),
    source: (0, _utils.validateOptionalType)("StringLiteral"),
    default: (0, _utils.validateOptional)((0, _utils.assertValueType)("boolean"))
  }
});
defineType("DeclareExportAllDeclaration", {
  visitor: ["source"],
  aliases: ["FlowDeclaration", "Statement", "Declaration"],
  fields: {
    source: (0, _utils.validateType)("StringLiteral"),
    exportKind: (0, _utils.validateOptional)((0, _utils.assertOneOf)("type", "value"))
  }
});
defineType("DeclaredPredicate", {
  visitor: ["value"],
  aliases: ["FlowPredicate"],
  fields: {
    value: (0, _utils.validateType)("Flow")
  }
});
defineType("ExistsTypeAnnotation", {
  aliases: ["FlowType"]
});
defineType("FunctionTypeAnnotation", {
  visitor: ["typeParameters", "params", "rest", "returnType"],
  aliases: ["FlowType"],
  fields: {
    typeParameters: (0, _utils.validateOptionalType)("TypeParameterDeclaration"),
    params: (0, _utils.validate)((0, _utils.arrayOfType)("FunctionTypeParam")),
    rest: (0, _utils.validateOptionalType)("FunctionTypeParam"),
    this: (0, _utils.validateOptionalType)("FunctionTypeParam"),
    returnType: (0, _utils.validateType)("FlowType")
  }
});
defineType("FunctionTypeParam", {
  visitor: ["name", "typeAnnotation"],
  fields: {
    name: (0, _utils.validateOptionalType)("Identifier"),
    typeAnnotation: (0, _utils.validateType)("FlowType"),
    optional: (0, _utils.validateOptional)((0, _utils.assertValueType)("boolean"))
  }
});
defineType("GenericTypeAnnotation", {
  visitor: ["id", "typeParameters"],
  aliases: ["FlowType"],
  fields: {
    id: (0, _utils.validateType)(["Identifier", "QualifiedTypeIdentifier"]),
    typeParameters: (0, _utils.validateOptionalType)("TypeParameterInstantiation")
  }
});
defineType("InferredPredicate", {
  aliases: ["FlowPredicate"]
});
defineType("InterfaceExtends", {
  visitor: ["id", "typeParameters"],
  fields: {
    id: (0, _utils.validateType)(["Identifier", "QualifiedTypeIdentifier"]),
    typeParameters: (0, _utils.validateOptionalType)("TypeParameterInstantiation")
  }
});
defineInterfaceishType("InterfaceDeclaration");
defineType("InterfaceTypeAnnotation", {
  visitor: ["extends", "body"],
  aliases: ["FlowType"],
  fields: {
    extends: (0, _utils.validateOptional)((0, _utils.arrayOfType)("InterfaceExtends")),
    body: (0, _utils.validateType)("ObjectTypeAnnotation")
  }
});
defineType("IntersectionTypeAnnotation", {
  visitor: ["types"],
  aliases: ["FlowType"],
  fields: {
    types: (0, _utils.validate)((0, _utils.arrayOfType)("FlowType"))
  }
});
defineType("MixedTypeAnnotation", {
  aliases: ["FlowType", "FlowBaseAnnotation"]
});
defineType("EmptyTypeAnnotation", {
  aliases: ["FlowType", "FlowBaseAnnotation"]
});
defineType("NullableTypeAnnotation", {
  visitor: ["typeAnnotation"],
  aliases: ["FlowType"],
  fields: {
    typeAnnotation: (0, _utils.validateType)("FlowType")
  }
});
defineType("NumberLiteralTypeAnnotation", {
  builder: ["value"],
  aliases: ["FlowType"],
  fields: {
    value: (0, _utils.validate)((0, _utils.assertValueType)("number"))
  }
});
defineType("NumberTypeAnnotation", {
  aliases: ["FlowType", "FlowBaseAnnotation"]
});
defineType("ObjectTypeAnnotation", {
  visitor: ["properties", "indexers", "callProperties", "internalSlots"],
  aliases: ["FlowType"],
  builder: ["properties", "indexers", "callProperties", "internalSlots", "exact"],
  fields: {
    properties: (0, _utils.validate)((0, _utils.arrayOfType)(["ObjectTypeProperty", "ObjectTypeSpreadProperty"])),
    indexers: {
      validate: (0, _utils.arrayOfType)("ObjectTypeIndexer"),
      optional: true,
      default: []
    },
    callProperties: {
      validate: (0, _utils.arrayOfType)("ObjectTypeCallProperty"),
      optional: true,
      default: []
    },
    internalSlots: {
      validate: (0, _utils.arrayOfType)("ObjectTypeInternalSlot"),
      optional: true,
      default: []
    },
    exact: {
      validate: (0, _utils.assertValueType)("boolean"),
      default: false
    },
    inexact: (0, _utils.validateOptional)((0, _utils.assertValueType)("boolean"))
  }
});
defineType("ObjectTypeInternalSlot", {
  visitor: ["id", "value", "optional", "static", "method"],
  aliases: ["UserWhitespacable"],
  fields: {
    id: (0, _utils.validateType)("Identifier"),
    value: (0, _utils.validateType)("FlowType"),
    optional: (0, _utils.validate)((0, _utils.assertValueType)("boolean")),
    static: (0, _utils.validate)((0, _utils.assertValueType)("boolean")),
    method: (0, _utils.validate)((0, _utils.assertValueType)("boolean"))
  }
});
defineType("ObjectTypeCallProperty", {
  visitor: ["value"],
  aliases: ["UserWhitespacable"],
  fields: {
    value: (0, _utils.validateType)("FlowType"),
    static: (0, _utils.validate)((0, _utils.assertValueType)("boolean"))
  }
});
defineType("ObjectTypeIndexer", {
  visitor: ["id", "key", "value", "variance"],
  aliases: ["UserWhitespacable"],
  fields: {
    id: (0, _utils.validateOptionalType)("Identifier"),
    key: (0, _utils.validateType)("FlowType"),
    value: (0, _utils.validateType)("FlowType"),
    static: (0, _utils.validate)((0, _utils.assertValueType)("boolean")),
    variance: (0, _utils.validateOptionalType)("Variance")
  }
});
defineType("ObjectTypeProperty", {
  visitor: ["key", "value", "variance"],
  aliases: ["UserWhitespacable"],
  fields: {
    key: (0, _utils.validateType)(["Identifier", "StringLiteral"]),
    value: (0, _utils.validateType)("FlowType"),
    kind: (0, _utils.validate)((0, _utils.assertOneOf)("init", "get", "set")),
    static: (0, _utils.validate)((0, _utils.assertValueType)("boolean")),
    proto: (0, _utils.validate)((0, _utils.assertValueType)("boolean")),
    optional: (0, _utils.validate)((0, _utils.assertValueType)("boolean")),
    variance: (0, _utils.validateOptionalType)("Variance"),
    method: (0, _utils.validate)((0, _utils.assertValueType)("boolean"))
  }
});
defineType("ObjectTypeSpreadProperty", {
  visitor: ["argument"],
  aliases: ["UserWhitespacable"],
  fields: {
    argument: (0, _utils.validateType)("FlowType")
  }
});
defineType("OpaqueType", {
  visitor: ["id", "typeParameters", "supertype", "impltype"],
  aliases: ["FlowDeclaration", "Statement", "Declaration"],
  fields: {
    id: (0, _utils.validateType)("Identifier"),
    typeParameters: (0, _utils.validateOptionalType)("TypeParameterDeclaration"),
    supertype: (0, _utils.validateOptionalType)("FlowType"),
    impltype: (0, _utils.validateType)("FlowType")
  }
});
defineType("QualifiedTypeIdentifier", {
  visitor: ["id", "qualification"],
  fields: {
    id: (0, _utils.validateType)("Identifier"),
    qualification: (0, _utils.validateType)(["Identifier", "QualifiedTypeIdentifier"])
  }
});
defineType("StringLiteralTypeAnnotation", {
  builder: ["value"],
  aliases: ["FlowType"],
  fields: {
    value: (0, _utils.validate)((0, _utils.assertValueType)("string"))
  }
});
defineType("StringTypeAnnotation", {
  aliases: ["FlowType", "FlowBaseAnnotation"]
});
defineType("SymbolTypeAnnotation", {
  aliases: ["FlowType", "FlowBaseAnnotation"]
});
defineType("ThisTypeAnnotation", {
  aliases: ["FlowType", "FlowBaseAnnotation"]
});
defineType("TupleTypeAnnotation", {
  visitor: ["types"],
  aliases: ["FlowType"],
  fields: {
    types: (0, _utils.validate)((0, _utils.arrayOfType)("FlowType"))
  }
});
defineType("TypeofTypeAnnotation", {
  visitor: ["argument"],
  aliases: ["FlowType"],
  fields: {
    argument: (0, _utils.validateType)("FlowType")
  }
});
defineType("TypeAlias", {
  visitor: ["id", "typeParameters", "right"],
  aliases: ["FlowDeclaration", "Statement", "Declaration"],
  fields: {
    id: (0, _utils.validateType)("Identifier"),
    typeParameters: (0, _utils.validateOptionalType)("TypeParameterDeclaration"),
    right: (0, _utils.validateType)("FlowType")
  }
});
defineType("TypeAnnotation", {
  visitor: ["typeAnnotation"],
  fields: {
    typeAnnotation: (0, _utils.validateType)("FlowType")
  }
});
defineType("TypeCastExpression", {
  visitor: ["expression", "typeAnnotation"],
  aliases: ["ExpressionWrapper", "Expression"],
  fields: {
    expression: (0, _utils.validateType)("Expression"),
    typeAnnotation: (0, _utils.validateType)("TypeAnnotation")
  }
});
defineType("TypeParameter", {
  visitor: ["bound", "default", "variance"],
  fields: {
    name: (0, _utils.validate)((0, _utils.assertValueType)("string")),
    bound: (0, _utils.validateOptionalType)("TypeAnnotation"),
    default: (0, _utils.validateOptionalType)("FlowType"),
    variance: (0, _utils.validateOptionalType)("Variance")
  }
});
defineType("TypeParameterDeclaration", {
  visitor: ["params"],
  fields: {
    params: (0, _utils.validate)((0, _utils.arrayOfType)("TypeParameter"))
  }
});
defineType("TypeParameterInstantiation", {
  visitor: ["params"],
  fields: {
    params: (0, _utils.validate)((0, _utils.arrayOfType)("FlowType"))
  }
});
defineType("UnionTypeAnnotation", {
  visitor: ["types"],
  aliases: ["FlowType"],
  fields: {
    types: (0, _utils.validate)((0, _utils.arrayOfType)("FlowType"))
  }
});
defineType("Variance", {
  builder: ["kind"],
  fields: {
    kind: (0, _utils.validate)((0, _utils.assertOneOf)("minus", "plus"))
  }
});
defineType("VoidTypeAnnotation", {
  aliases: ["FlowType", "FlowBaseAnnotation"]
});
defineType("EnumDeclaration", {
  aliases: ["Statement", "Declaration"],
  visitor: ["id", "body"],
  fields: {
    id: (0, _utils.validateType)("Identifier"),
    body: (0, _utils.validateType)(["EnumBooleanBody", "EnumNumberBody", "EnumStringBody", "EnumSymbolBody"])
  }
});
defineType("EnumBooleanBody", {
  aliases: ["EnumBody"],
  visitor: ["members"],
  fields: {
    explicitType: (0, _utils.validate)((0, _utils.assertValueType)("boolean")),
    members: (0, _utils.validateArrayOfType)("EnumBooleanMember"),
    hasUnknownMembers: (0, _utils.validate)((0, _utils.assertValueType)("boolean"))
  }
});
defineType("EnumNumberBody", {
  aliases: ["EnumBody"],
  visitor: ["members"],
  fields: {
    explicitType: (0, _utils.validate)((0, _utils.assertValueType)("boolean")),
    members: (0, _utils.validateArrayOfType)("EnumNumberMember"),
    hasUnknownMembers: (0, _utils.validate)((0, _utils.assertValueType)("boolean"))
  }
});
defineType("EnumStringBody", {
  aliases: ["EnumBody"],
  visitor: ["members"],
  fields: {
    explicitType: (0, _utils.validate)((0, _utils.assertValueType)("boolean")),
    members: (0, _utils.validateArrayOfType)(["EnumStringMember", "EnumDefaultedMember"]),
    hasUnknownMembers: (0, _utils.validate)((0, _utils.assertValueType)("boolean"))
  }
});
defineType("EnumSymbolBody", {
  aliases: ["EnumBody"],
  visitor: ["members"],
  fields: {
    members: (0, _utils.validateArrayOfType)("EnumDefaultedMember"),
    hasUnknownMembers: (0, _utils.validate)((0, _utils.assertValueType)("boolean"))
  }
});
defineType("EnumBooleanMember", {
  aliases: ["EnumMember"],
  visitor: ["id"],
  fields: {
    id: (0, _utils.validateType)("Identifier"),
    init: (0, _utils.validateType)("BooleanLiteral")
  }
});
defineType("EnumNumberMember", {
  aliases: ["EnumMember"],
  visitor: ["id", "init"],
  fields: {
    id: (0, _utils.validateType)("Identifier"),
    init: (0, _utils.validateType)("NumericLiteral")
  }
});
defineType("EnumStringMember", {
  aliases: ["EnumMember"],
  visitor: ["id", "init"],
  fields: {
    id: (0, _utils.validateType)("Identifier"),
    init: (0, _utils.validateType)("StringLiteral")
  }
});
defineType("EnumDefaultedMember", {
  aliases: ["EnumMember"],
  visitor: ["id"],
  fields: {
    id: (0, _utils.validateType)("Identifier")
  }
});
defineType("IndexedAccessType", {
  visitor: ["objectType", "indexType"],
  aliases: ["FlowType"],
  fields: {
    objectType: (0, _utils.validateType)("FlowType"),
    indexType: (0, _utils.validateType)("FlowType")
  }
});
defineType("OptionalIndexedAccessType", {
  visitor: ["objectType", "indexType"],
  aliases: ["FlowType"],
  fields: {
    objectType: (0, _utils.validateType)("FlowType"),
    indexType: (0, _utils.validateType)("FlowType"),
    optional: (0, _utils.validate)((0, _utils.assertValueType)("boolean"))
  }
});



},{"./utils.js":68}],63:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "ALIAS_KEYS", {
  enumerable: true,
  get: function () {
    return _utils.ALIAS_KEYS;
  }
});
Object.defineProperty(exports, "BUILDER_KEYS", {
  enumerable: true,
  get: function () {
    return _utils.BUILDER_KEYS;
  }
});
Object.defineProperty(exports, "DEPRECATED_ALIASES", {
  enumerable: true,
  get: function () {
    return _deprecatedAliases.DEPRECATED_ALIASES;
  }
});
Object.defineProperty(exports, "DEPRECATED_KEYS", {
  enumerable: true,
  get: function () {
    return _utils.DEPRECATED_KEYS;
  }
});
Object.defineProperty(exports, "FLIPPED_ALIAS_KEYS", {
  enumerable: true,
  get: function () {
    return _utils.FLIPPED_ALIAS_KEYS;
  }
});
Object.defineProperty(exports, "NODE_FIELDS", {
  enumerable: true,
  get: function () {
    return _utils.NODE_FIELDS;
  }
});
Object.defineProperty(exports, "NODE_PARENT_VALIDATIONS", {
  enumerable: true,
  get: function () {
    return _utils.NODE_PARENT_VALIDATIONS;
  }
});
Object.defineProperty(exports, "PLACEHOLDERS", {
  enumerable: true,
  get: function () {
    return _placeholders.PLACEHOLDERS;
  }
});
Object.defineProperty(exports, "PLACEHOLDERS_ALIAS", {
  enumerable: true,
  get: function () {
    return _placeholders.PLACEHOLDERS_ALIAS;
  }
});
Object.defineProperty(exports, "PLACEHOLDERS_FLIPPED_ALIAS", {
  enumerable: true,
  get: function () {
    return _placeholders.PLACEHOLDERS_FLIPPED_ALIAS;
  }
});
exports.TYPES = void 0;
Object.defineProperty(exports, "VISITOR_KEYS", {
  enumerable: true,
  get: function () {
    return _utils.VISITOR_KEYS;
  }
});
var _toFastProperties = require("to-fast-properties");
require("./core.js");
require("./flow.js");
require("./jsx.js");
require("./misc.js");
require("./experimental.js");
require("./typescript.js");
var _utils = require("./utils.js");
var _placeholders = require("./placeholders.js");
var _deprecatedAliases = require("./deprecated-aliases.js");
Object.keys(_deprecatedAliases.DEPRECATED_ALIASES).forEach(deprecatedAlias => {
  _utils.FLIPPED_ALIAS_KEYS[deprecatedAlias] = _utils.FLIPPED_ALIAS_KEYS[_deprecatedAliases.DEPRECATED_ALIASES[deprecatedAlias]];
});
_toFastProperties(_utils.VISITOR_KEYS);
_toFastProperties(_utils.ALIAS_KEYS);
_toFastProperties(_utils.FLIPPED_ALIAS_KEYS);
_toFastProperties(_utils.NODE_FIELDS);
_toFastProperties(_utils.BUILDER_KEYS);
_toFastProperties(_utils.DEPRECATED_KEYS);
_toFastProperties(_placeholders.PLACEHOLDERS_ALIAS);
_toFastProperties(_placeholders.PLACEHOLDERS_FLIPPED_ALIAS);
const TYPES = exports.TYPES = [].concat(Object.keys(_utils.VISITOR_KEYS), Object.keys(_utils.FLIPPED_ALIAS_KEYS), Object.keys(_utils.DEPRECATED_KEYS));



},{"./core.js":59,"./deprecated-aliases.js":60,"./experimental.js":61,"./flow.js":62,"./jsx.js":64,"./misc.js":65,"./placeholders.js":66,"./typescript.js":67,"./utils.js":68,"to-fast-properties":117}],64:[function(require,module,exports){
"use strict";

var _utils = require("./utils.js");
const defineType = (0, _utils.defineAliasedType)("JSX");
defineType("JSXAttribute", {
  visitor: ["name", "value"],
  aliases: ["Immutable"],
  fields: {
    name: {
      validate: (0, _utils.assertNodeType)("JSXIdentifier", "JSXNamespacedName")
    },
    value: {
      optional: true,
      validate: (0, _utils.assertNodeType)("JSXElement", "JSXFragment", "StringLiteral", "JSXExpressionContainer")
    }
  }
});
defineType("JSXClosingElement", {
  visitor: ["name"],
  aliases: ["Immutable"],
  fields: {
    name: {
      validate: (0, _utils.assertNodeType)("JSXIdentifier", "JSXMemberExpression", "JSXNamespacedName")
    }
  }
});
defineType("JSXElement", {
  builder: ["openingElement", "closingElement", "children", "selfClosing"],
  visitor: ["openingElement", "children", "closingElement"],
  aliases: ["Immutable", "Expression"],
  fields: Object.assign({
    openingElement: {
      validate: (0, _utils.assertNodeType)("JSXOpeningElement")
    },
    closingElement: {
      optional: true,
      validate: (0, _utils.assertNodeType)("JSXClosingElement")
    },
    children: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("JSXText", "JSXExpressionContainer", "JSXSpreadChild", "JSXElement", "JSXFragment")))
    }
  }, {
    selfClosing: {
      validate: (0, _utils.assertValueType)("boolean"),
      optional: true
    }
  })
});
defineType("JSXEmptyExpression", {});
defineType("JSXExpressionContainer", {
  visitor: ["expression"],
  aliases: ["Immutable"],
  fields: {
    expression: {
      validate: (0, _utils.assertNodeType)("Expression", "JSXEmptyExpression")
    }
  }
});
defineType("JSXSpreadChild", {
  visitor: ["expression"],
  aliases: ["Immutable"],
  fields: {
    expression: {
      validate: (0, _utils.assertNodeType)("Expression")
    }
  }
});
defineType("JSXIdentifier", {
  builder: ["name"],
  fields: {
    name: {
      validate: (0, _utils.assertValueType)("string")
    }
  }
});
defineType("JSXMemberExpression", {
  visitor: ["object", "property"],
  fields: {
    object: {
      validate: (0, _utils.assertNodeType)("JSXMemberExpression", "JSXIdentifier")
    },
    property: {
      validate: (0, _utils.assertNodeType)("JSXIdentifier")
    }
  }
});
defineType("JSXNamespacedName", {
  visitor: ["namespace", "name"],
  fields: {
    namespace: {
      validate: (0, _utils.assertNodeType)("JSXIdentifier")
    },
    name: {
      validate: (0, _utils.assertNodeType)("JSXIdentifier")
    }
  }
});
defineType("JSXOpeningElement", {
  builder: ["name", "attributes", "selfClosing"],
  visitor: ["name", "attributes"],
  aliases: ["Immutable"],
  fields: {
    name: {
      validate: (0, _utils.assertNodeType)("JSXIdentifier", "JSXMemberExpression", "JSXNamespacedName")
    },
    selfClosing: {
      default: false
    },
    attributes: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("JSXAttribute", "JSXSpreadAttribute")))
    },
    typeParameters: {
      validate: (0, _utils.assertNodeType)("TypeParameterInstantiation", "TSTypeParameterInstantiation"),
      optional: true
    }
  }
});
defineType("JSXSpreadAttribute", {
  visitor: ["argument"],
  fields: {
    argument: {
      validate: (0, _utils.assertNodeType)("Expression")
    }
  }
});
defineType("JSXText", {
  aliases: ["Immutable"],
  builder: ["value"],
  fields: {
    value: {
      validate: (0, _utils.assertValueType)("string")
    }
  }
});
defineType("JSXFragment", {
  builder: ["openingFragment", "closingFragment", "children"],
  visitor: ["openingFragment", "children", "closingFragment"],
  aliases: ["Immutable", "Expression"],
  fields: {
    openingFragment: {
      validate: (0, _utils.assertNodeType)("JSXOpeningFragment")
    },
    closingFragment: {
      validate: (0, _utils.assertNodeType)("JSXClosingFragment")
    },
    children: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("JSXText", "JSXExpressionContainer", "JSXSpreadChild", "JSXElement", "JSXFragment")))
    }
  }
});
defineType("JSXOpeningFragment", {
  aliases: ["Immutable"]
});
defineType("JSXClosingFragment", {
  aliases: ["Immutable"]
});



},{"./utils.js":68}],65:[function(require,module,exports){
"use strict";

var _utils = require("./utils.js");
var _placeholders = require("./placeholders.js");
const defineType = (0, _utils.defineAliasedType)("Miscellaneous");
{
  defineType("Noop", {
    visitor: []
  });
}
defineType("Placeholder", {
  visitor: [],
  builder: ["expectedNode", "name"],
  fields: {
    name: {
      validate: (0, _utils.assertNodeType)("Identifier")
    },
    expectedNode: {
      validate: (0, _utils.assertOneOf)(..._placeholders.PLACEHOLDERS)
    }
  }
});
defineType("V8IntrinsicIdentifier", {
  builder: ["name"],
  fields: {
    name: {
      validate: (0, _utils.assertValueType)("string")
    }
  }
});



},{"./placeholders.js":66,"./utils.js":68}],66:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PLACEHOLDERS_FLIPPED_ALIAS = exports.PLACEHOLDERS_ALIAS = exports.PLACEHOLDERS = void 0;
var _utils = require("./utils.js");
const PLACEHOLDERS = exports.PLACEHOLDERS = ["Identifier", "StringLiteral", "Expression", "Statement", "Declaration", "BlockStatement", "ClassBody", "Pattern"];
const PLACEHOLDERS_ALIAS = exports.PLACEHOLDERS_ALIAS = {
  Declaration: ["Statement"],
  Pattern: ["PatternLike", "LVal"]
};
for (const type of PLACEHOLDERS) {
  const alias = _utils.ALIAS_KEYS[type];
  if (alias != null && alias.length) PLACEHOLDERS_ALIAS[type] = alias;
}
const PLACEHOLDERS_FLIPPED_ALIAS = exports.PLACEHOLDERS_FLIPPED_ALIAS = {};
Object.keys(PLACEHOLDERS_ALIAS).forEach(type => {
  PLACEHOLDERS_ALIAS[type].forEach(alias => {
    if (!Object.hasOwnProperty.call(PLACEHOLDERS_FLIPPED_ALIAS, alias)) {
      PLACEHOLDERS_FLIPPED_ALIAS[alias] = [];
    }
    PLACEHOLDERS_FLIPPED_ALIAS[alias].push(type);
  });
});



},{"./utils.js":68}],67:[function(require,module,exports){
"use strict";

var _utils = require("./utils.js");
var _core = require("./core.js");
var _is = require("../validators/is.js");
const defineType = (0, _utils.defineAliasedType)("TypeScript");
const bool = (0, _utils.assertValueType)("boolean");
const tSFunctionTypeAnnotationCommon = () => ({
  returnType: {
    validate: (0, _utils.assertNodeType)("TSTypeAnnotation", "Noop"),
    optional: true
  },
  typeParameters: {
    validate: (0, _utils.assertNodeType)("TSTypeParameterDeclaration", "Noop"),
    optional: true
  }
});
defineType("TSParameterProperty", {
  aliases: ["LVal"],
  visitor: ["parameter"],
  fields: {
    accessibility: {
      validate: (0, _utils.assertOneOf)("public", "private", "protected"),
      optional: true
    },
    readonly: {
      validate: (0, _utils.assertValueType)("boolean"),
      optional: true
    },
    parameter: {
      validate: (0, _utils.assertNodeType)("Identifier", "AssignmentPattern")
    },
    override: {
      validate: (0, _utils.assertValueType)("boolean"),
      optional: true
    },
    decorators: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("Decorator"))),
      optional: true
    }
  }
});
defineType("TSDeclareFunction", {
  aliases: ["Statement", "Declaration"],
  visitor: ["id", "typeParameters", "params", "returnType"],
  fields: Object.assign({}, (0, _core.functionDeclarationCommon)(), tSFunctionTypeAnnotationCommon())
});
defineType("TSDeclareMethod", {
  visitor: ["decorators", "key", "typeParameters", "params", "returnType"],
  fields: Object.assign({}, (0, _core.classMethodOrDeclareMethodCommon)(), tSFunctionTypeAnnotationCommon())
});
defineType("TSQualifiedName", {
  aliases: ["TSEntityName"],
  visitor: ["left", "right"],
  fields: {
    left: (0, _utils.validateType)("TSEntityName"),
    right: (0, _utils.validateType)("Identifier")
  }
});
const signatureDeclarationCommon = () => ({
  typeParameters: (0, _utils.validateOptionalType)("TSTypeParameterDeclaration"),
  ["parameters"]: (0, _utils.validateArrayOfType)(["ArrayPattern", "Identifier", "ObjectPattern", "RestElement"]),
  ["typeAnnotation"]: (0, _utils.validateOptionalType)("TSTypeAnnotation")
});
const callConstructSignatureDeclaration = {
  aliases: ["TSTypeElement"],
  visitor: ["typeParameters", "parameters", "typeAnnotation"],
  fields: signatureDeclarationCommon()
};
defineType("TSCallSignatureDeclaration", callConstructSignatureDeclaration);
defineType("TSConstructSignatureDeclaration", callConstructSignatureDeclaration);
const namedTypeElementCommon = () => ({
  key: (0, _utils.validateType)("Expression"),
  computed: {
    default: false
  },
  optional: (0, _utils.validateOptional)(bool)
});
defineType("TSPropertySignature", {
  aliases: ["TSTypeElement"],
  visitor: ["key", "typeAnnotation", "initializer"],
  fields: Object.assign({}, namedTypeElementCommon(), {
    readonly: (0, _utils.validateOptional)(bool),
    typeAnnotation: (0, _utils.validateOptionalType)("TSTypeAnnotation"),
    initializer: (0, _utils.validateOptionalType)("Expression"),
    kind: {
      validate: (0, _utils.assertOneOf)("get", "set")
    }
  })
});
defineType("TSMethodSignature", {
  aliases: ["TSTypeElement"],
  visitor: ["key", "typeParameters", "parameters", "typeAnnotation"],
  fields: Object.assign({}, signatureDeclarationCommon(), namedTypeElementCommon(), {
    kind: {
      validate: (0, _utils.assertOneOf)("method", "get", "set")
    }
  })
});
defineType("TSIndexSignature", {
  aliases: ["TSTypeElement"],
  visitor: ["parameters", "typeAnnotation"],
  fields: {
    readonly: (0, _utils.validateOptional)(bool),
    static: (0, _utils.validateOptional)(bool),
    parameters: (0, _utils.validateArrayOfType)("Identifier"),
    typeAnnotation: (0, _utils.validateOptionalType)("TSTypeAnnotation")
  }
});
const tsKeywordTypes = ["TSAnyKeyword", "TSBooleanKeyword", "TSBigIntKeyword", "TSIntrinsicKeyword", "TSNeverKeyword", "TSNullKeyword", "TSNumberKeyword", "TSObjectKeyword", "TSStringKeyword", "TSSymbolKeyword", "TSUndefinedKeyword", "TSUnknownKeyword", "TSVoidKeyword"];
for (const type of tsKeywordTypes) {
  defineType(type, {
    aliases: ["TSType", "TSBaseType"],
    visitor: [],
    fields: {}
  });
}
defineType("TSThisType", {
  aliases: ["TSType", "TSBaseType"],
  visitor: [],
  fields: {}
});
const fnOrCtrBase = {
  aliases: ["TSType"],
  visitor: ["typeParameters", "parameters", "typeAnnotation"]
};
defineType("TSFunctionType", Object.assign({}, fnOrCtrBase, {
  fields: signatureDeclarationCommon()
}));
defineType("TSConstructorType", Object.assign({}, fnOrCtrBase, {
  fields: Object.assign({}, signatureDeclarationCommon(), {
    abstract: (0, _utils.validateOptional)(bool)
  })
}));
defineType("TSTypeReference", {
  aliases: ["TSType"],
  visitor: ["typeName", "typeParameters"],
  fields: {
    typeName: (0, _utils.validateType)("TSEntityName"),
    typeParameters: (0, _utils.validateOptionalType)("TSTypeParameterInstantiation")
  }
});
defineType("TSTypePredicate", {
  aliases: ["TSType"],
  visitor: ["parameterName", "typeAnnotation"],
  builder: ["parameterName", "typeAnnotation", "asserts"],
  fields: {
    parameterName: (0, _utils.validateType)(["Identifier", "TSThisType"]),
    typeAnnotation: (0, _utils.validateOptionalType)("TSTypeAnnotation"),
    asserts: (0, _utils.validateOptional)(bool)
  }
});
defineType("TSTypeQuery", {
  aliases: ["TSType"],
  visitor: ["exprName", "typeParameters"],
  fields: {
    exprName: (0, _utils.validateType)(["TSEntityName", "TSImportType"]),
    typeParameters: (0, _utils.validateOptionalType)("TSTypeParameterInstantiation")
  }
});
defineType("TSTypeLiteral", {
  aliases: ["TSType"],
  visitor: ["members"],
  fields: {
    members: (0, _utils.validateArrayOfType)("TSTypeElement")
  }
});
defineType("TSArrayType", {
  aliases: ["TSType"],
  visitor: ["elementType"],
  fields: {
    elementType: (0, _utils.validateType)("TSType")
  }
});
defineType("TSTupleType", {
  aliases: ["TSType"],
  visitor: ["elementTypes"],
  fields: {
    elementTypes: (0, _utils.validateArrayOfType)(["TSType", "TSNamedTupleMember"])
  }
});
defineType("TSOptionalType", {
  aliases: ["TSType"],
  visitor: ["typeAnnotation"],
  fields: {
    typeAnnotation: (0, _utils.validateType)("TSType")
  }
});
defineType("TSRestType", {
  aliases: ["TSType"],
  visitor: ["typeAnnotation"],
  fields: {
    typeAnnotation: (0, _utils.validateType)("TSType")
  }
});
defineType("TSNamedTupleMember", {
  visitor: ["label", "elementType"],
  builder: ["label", "elementType", "optional"],
  fields: {
    label: (0, _utils.validateType)("Identifier"),
    optional: {
      validate: bool,
      default: false
    },
    elementType: (0, _utils.validateType)("TSType")
  }
});
const unionOrIntersection = {
  aliases: ["TSType"],
  visitor: ["types"],
  fields: {
    types: (0, _utils.validateArrayOfType)("TSType")
  }
};
defineType("TSUnionType", unionOrIntersection);
defineType("TSIntersectionType", unionOrIntersection);
defineType("TSConditionalType", {
  aliases: ["TSType"],
  visitor: ["checkType", "extendsType", "trueType", "falseType"],
  fields: {
    checkType: (0, _utils.validateType)("TSType"),
    extendsType: (0, _utils.validateType)("TSType"),
    trueType: (0, _utils.validateType)("TSType"),
    falseType: (0, _utils.validateType)("TSType")
  }
});
defineType("TSInferType", {
  aliases: ["TSType"],
  visitor: ["typeParameter"],
  fields: {
    typeParameter: (0, _utils.validateType)("TSTypeParameter")
  }
});
defineType("TSParenthesizedType", {
  aliases: ["TSType"],
  visitor: ["typeAnnotation"],
  fields: {
    typeAnnotation: (0, _utils.validateType)("TSType")
  }
});
defineType("TSTypeOperator", {
  aliases: ["TSType"],
  visitor: ["typeAnnotation"],
  fields: {
    operator: (0, _utils.validate)((0, _utils.assertValueType)("string")),
    typeAnnotation: (0, _utils.validateType)("TSType")
  }
});
defineType("TSIndexedAccessType", {
  aliases: ["TSType"],
  visitor: ["objectType", "indexType"],
  fields: {
    objectType: (0, _utils.validateType)("TSType"),
    indexType: (0, _utils.validateType)("TSType")
  }
});
defineType("TSMappedType", {
  aliases: ["TSType"],
  visitor: ["typeParameter", "typeAnnotation", "nameType"],
  fields: {
    readonly: (0, _utils.validateOptional)((0, _utils.assertOneOf)(true, false, "+", "-")),
    typeParameter: (0, _utils.validateType)("TSTypeParameter"),
    optional: (0, _utils.validateOptional)((0, _utils.assertOneOf)(true, false, "+", "-")),
    typeAnnotation: (0, _utils.validateOptionalType)("TSType"),
    nameType: (0, _utils.validateOptionalType)("TSType")
  }
});
defineType("TSLiteralType", {
  aliases: ["TSType", "TSBaseType"],
  visitor: ["literal"],
  fields: {
    literal: {
      validate: function () {
        const unaryExpression = (0, _utils.assertNodeType)("NumericLiteral", "BigIntLiteral");
        const unaryOperator = (0, _utils.assertOneOf)("-");
        const literal = (0, _utils.assertNodeType)("NumericLiteral", "StringLiteral", "BooleanLiteral", "BigIntLiteral", "TemplateLiteral");
        function validator(parent, key, node) {
          if ((0, _is.default)("UnaryExpression", node)) {
            unaryOperator(node, "operator", node.operator);
            unaryExpression(node, "argument", node.argument);
          } else {
            literal(parent, key, node);
          }
        }
        validator.oneOfNodeTypes = ["NumericLiteral", "StringLiteral", "BooleanLiteral", "BigIntLiteral", "TemplateLiteral", "UnaryExpression"];
        return validator;
      }()
    }
  }
});
defineType("TSExpressionWithTypeArguments", {
  aliases: ["TSType"],
  visitor: ["expression", "typeParameters"],
  fields: {
    expression: (0, _utils.validateType)("TSEntityName"),
    typeParameters: (0, _utils.validateOptionalType)("TSTypeParameterInstantiation")
  }
});
defineType("TSInterfaceDeclaration", {
  aliases: ["Statement", "Declaration"],
  visitor: ["id", "typeParameters", "extends", "body"],
  fields: {
    declare: (0, _utils.validateOptional)(bool),
    id: (0, _utils.validateType)("Identifier"),
    typeParameters: (0, _utils.validateOptionalType)("TSTypeParameterDeclaration"),
    extends: (0, _utils.validateOptional)((0, _utils.arrayOfType)("TSExpressionWithTypeArguments")),
    body: (0, _utils.validateType)("TSInterfaceBody")
  }
});
defineType("TSInterfaceBody", {
  visitor: ["body"],
  fields: {
    body: (0, _utils.validateArrayOfType)("TSTypeElement")
  }
});
defineType("TSTypeAliasDeclaration", {
  aliases: ["Statement", "Declaration"],
  visitor: ["id", "typeParameters", "typeAnnotation"],
  fields: {
    declare: (0, _utils.validateOptional)(bool),
    id: (0, _utils.validateType)("Identifier"),
    typeParameters: (0, _utils.validateOptionalType)("TSTypeParameterDeclaration"),
    typeAnnotation: (0, _utils.validateType)("TSType")
  }
});
defineType("TSInstantiationExpression", {
  aliases: ["Expression"],
  visitor: ["expression", "typeParameters"],
  fields: {
    expression: (0, _utils.validateType)("Expression"),
    typeParameters: (0, _utils.validateOptionalType)("TSTypeParameterInstantiation")
  }
});
const TSTypeExpression = {
  aliases: ["Expression", "LVal", "PatternLike"],
  visitor: ["expression", "typeAnnotation"],
  fields: {
    expression: (0, _utils.validateType)("Expression"),
    typeAnnotation: (0, _utils.validateType)("TSType")
  }
};
defineType("TSAsExpression", TSTypeExpression);
defineType("TSSatisfiesExpression", TSTypeExpression);
defineType("TSTypeAssertion", {
  aliases: ["Expression", "LVal", "PatternLike"],
  visitor: ["typeAnnotation", "expression"],
  fields: {
    typeAnnotation: (0, _utils.validateType)("TSType"),
    expression: (0, _utils.validateType)("Expression")
  }
});
defineType("TSEnumDeclaration", {
  aliases: ["Statement", "Declaration"],
  visitor: ["id", "members"],
  fields: {
    declare: (0, _utils.validateOptional)(bool),
    const: (0, _utils.validateOptional)(bool),
    id: (0, _utils.validateType)("Identifier"),
    members: (0, _utils.validateArrayOfType)("TSEnumMember"),
    initializer: (0, _utils.validateOptionalType)("Expression")
  }
});
defineType("TSEnumMember", {
  visitor: ["id", "initializer"],
  fields: {
    id: (0, _utils.validateType)(["Identifier", "StringLiteral"]),
    initializer: (0, _utils.validateOptionalType)("Expression")
  }
});
defineType("TSModuleDeclaration", {
  aliases: ["Statement", "Declaration"],
  visitor: ["id", "body"],
  fields: {
    declare: (0, _utils.validateOptional)(bool),
    global: (0, _utils.validateOptional)(bool),
    id: (0, _utils.validateType)(["Identifier", "StringLiteral"]),
    body: (0, _utils.validateType)(["TSModuleBlock", "TSModuleDeclaration"])
  }
});
defineType("TSModuleBlock", {
  aliases: ["Scopable", "Block", "BlockParent", "FunctionParent"],
  visitor: ["body"],
  fields: {
    body: (0, _utils.validateArrayOfType)("Statement")
  }
});
defineType("TSImportType", {
  aliases: ["TSType"],
  visitor: ["argument", "qualifier", "typeParameters"],
  fields: {
    argument: (0, _utils.validateType)("StringLiteral"),
    qualifier: (0, _utils.validateOptionalType)("TSEntityName"),
    typeParameters: (0, _utils.validateOptionalType)("TSTypeParameterInstantiation")
  }
});
defineType("TSImportEqualsDeclaration", {
  aliases: ["Statement"],
  visitor: ["id", "moduleReference"],
  fields: {
    isExport: (0, _utils.validate)(bool),
    id: (0, _utils.validateType)("Identifier"),
    moduleReference: (0, _utils.validateType)(["TSEntityName", "TSExternalModuleReference"]),
    importKind: {
      validate: (0, _utils.assertOneOf)("type", "value"),
      optional: true
    }
  }
});
defineType("TSExternalModuleReference", {
  visitor: ["expression"],
  fields: {
    expression: (0, _utils.validateType)("StringLiteral")
  }
});
defineType("TSNonNullExpression", {
  aliases: ["Expression", "LVal", "PatternLike"],
  visitor: ["expression"],
  fields: {
    expression: (0, _utils.validateType)("Expression")
  }
});
defineType("TSExportAssignment", {
  aliases: ["Statement"],
  visitor: ["expression"],
  fields: {
    expression: (0, _utils.validateType)("Expression")
  }
});
defineType("TSNamespaceExportDeclaration", {
  aliases: ["Statement"],
  visitor: ["id"],
  fields: {
    id: (0, _utils.validateType)("Identifier")
  }
});
defineType("TSTypeAnnotation", {
  visitor: ["typeAnnotation"],
  fields: {
    typeAnnotation: {
      validate: (0, _utils.assertNodeType)("TSType")
    }
  }
});
defineType("TSTypeParameterInstantiation", {
  visitor: ["params"],
  fields: {
    params: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("TSType")))
    }
  }
});
defineType("TSTypeParameterDeclaration", {
  visitor: ["params"],
  fields: {
    params: {
      validate: (0, _utils.chain)((0, _utils.assertValueType)("array"), (0, _utils.assertEach)((0, _utils.assertNodeType)("TSTypeParameter")))
    }
  }
});
defineType("TSTypeParameter", {
  builder: ["constraint", "default", "name"],
  visitor: ["constraint", "default"],
  fields: {
    name: {
      validate: (0, _utils.assertValueType)("string")
    },
    in: {
      validate: (0, _utils.assertValueType)("boolean"),
      optional: true
    },
    out: {
      validate: (0, _utils.assertValueType)("boolean"),
      optional: true
    },
    const: {
      validate: (0, _utils.assertValueType)("boolean"),
      optional: true
    },
    constraint: {
      validate: (0, _utils.assertNodeType)("TSType"),
      optional: true
    },
    default: {
      validate: (0, _utils.assertNodeType)("TSType"),
      optional: true
    }
  }
});



},{"../validators/is.js":87,"./core.js":59,"./utils.js":68}],68:[function(require,module,exports){
(function (process){(function (){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.VISITOR_KEYS = exports.NODE_PARENT_VALIDATIONS = exports.NODE_FIELDS = exports.FLIPPED_ALIAS_KEYS = exports.DEPRECATED_KEYS = exports.BUILDER_KEYS = exports.ALIAS_KEYS = void 0;
exports.arrayOf = arrayOf;
exports.arrayOfType = arrayOfType;
exports.assertEach = assertEach;
exports.assertNodeOrValueType = assertNodeOrValueType;
exports.assertNodeType = assertNodeType;
exports.assertOneOf = assertOneOf;
exports.assertOptionalChainStart = assertOptionalChainStart;
exports.assertShape = assertShape;
exports.assertValueType = assertValueType;
exports.chain = chain;
exports.default = defineType;
exports.defineAliasedType = defineAliasedType;
exports.typeIs = typeIs;
exports.validate = validate;
exports.validateArrayOfType = validateArrayOfType;
exports.validateOptional = validateOptional;
exports.validateOptionalType = validateOptionalType;
exports.validateType = validateType;
var _is = require("../validators/is.js");
var _validate = require("../validators/validate.js");
const VISITOR_KEYS = exports.VISITOR_KEYS = {};
const ALIAS_KEYS = exports.ALIAS_KEYS = {};
const FLIPPED_ALIAS_KEYS = exports.FLIPPED_ALIAS_KEYS = {};
const NODE_FIELDS = exports.NODE_FIELDS = {};
const BUILDER_KEYS = exports.BUILDER_KEYS = {};
const DEPRECATED_KEYS = exports.DEPRECATED_KEYS = {};
const NODE_PARENT_VALIDATIONS = exports.NODE_PARENT_VALIDATIONS = {};
function getType(val) {
  if (Array.isArray(val)) {
    return "array";
  } else if (val === null) {
    return "null";
  } else {
    return typeof val;
  }
}
function validate(validate) {
  return {
    validate
  };
}
function typeIs(typeName) {
  return typeof typeName === "string" ? assertNodeType(typeName) : assertNodeType(...typeName);
}
function validateType(typeName) {
  return validate(typeIs(typeName));
}
function validateOptional(validate) {
  return {
    validate,
    optional: true
  };
}
function validateOptionalType(typeName) {
  return {
    validate: typeIs(typeName),
    optional: true
  };
}
function arrayOf(elementType) {
  return chain(assertValueType("array"), assertEach(elementType));
}
function arrayOfType(typeName) {
  return arrayOf(typeIs(typeName));
}
function validateArrayOfType(typeName) {
  return validate(arrayOfType(typeName));
}
function assertEach(callback) {
  function validator(node, key, val) {
    if (!Array.isArray(val)) return;
    for (let i = 0; i < val.length; i++) {
      const subkey = `${key}[${i}]`;
      const v = val[i];
      callback(node, subkey, v);
      if (process.env.BABEL_TYPES_8_BREAKING) (0, _validate.validateChild)(node, subkey, v);
    }
  }
  validator.each = callback;
  return validator;
}
function assertOneOf(...values) {
  function validate(node, key, val) {
    if (values.indexOf(val) < 0) {
      throw new TypeError(`Property ${key} expected value to be one of ${JSON.stringify(values)} but got ${JSON.stringify(val)}`);
    }
  }
  validate.oneOf = values;
  return validate;
}
function assertNodeType(...types) {
  function validate(node, key, val) {
    for (const type of types) {
      if ((0, _is.default)(type, val)) {
        (0, _validate.validateChild)(node, key, val);
        return;
      }
    }
    throw new TypeError(`Property ${key} of ${node.type} expected node to be of a type ${JSON.stringify(types)} but instead got ${JSON.stringify(val == null ? void 0 : val.type)}`);
  }
  validate.oneOfNodeTypes = types;
  return validate;
}
function assertNodeOrValueType(...types) {
  function validate(node, key, val) {
    for (const type of types) {
      if (getType(val) === type || (0, _is.default)(type, val)) {
        (0, _validate.validateChild)(node, key, val);
        return;
      }
    }
    throw new TypeError(`Property ${key} of ${node.type} expected node to be of a type ${JSON.stringify(types)} but instead got ${JSON.stringify(val == null ? void 0 : val.type)}`);
  }
  validate.oneOfNodeOrValueTypes = types;
  return validate;
}
function assertValueType(type) {
  function validate(node, key, val) {
    const valid = getType(val) === type;
    if (!valid) {
      throw new TypeError(`Property ${key} expected type of ${type} but got ${getType(val)}`);
    }
  }
  validate.type = type;
  return validate;
}
function assertShape(shape) {
  function validate(node, key, val) {
    const errors = [];
    for (const property of Object.keys(shape)) {
      try {
        (0, _validate.validateField)(node, property, val[property], shape[property]);
      } catch (error) {
        if (error instanceof TypeError) {
          errors.push(error.message);
          continue;
        }
        throw error;
      }
    }
    if (errors.length) {
      throw new TypeError(`Property ${key} of ${node.type} expected to have the following:\n${errors.join("\n")}`);
    }
  }
  validate.shapeOf = shape;
  return validate;
}
function assertOptionalChainStart() {
  function validate(node) {
    var _current;
    let current = node;
    while (node) {
      const {
        type
      } = current;
      if (type === "OptionalCallExpression") {
        if (current.optional) return;
        current = current.callee;
        continue;
      }
      if (type === "OptionalMemberExpression") {
        if (current.optional) return;
        current = current.object;
        continue;
      }
      break;
    }
    throw new TypeError(`Non-optional ${node.type} must chain from an optional OptionalMemberExpression or OptionalCallExpression. Found chain from ${(_current = current) == null ? void 0 : _current.type}`);
  }
  return validate;
}
function chain(...fns) {
  function validate(...args) {
    for (const fn of fns) {
      fn(...args);
    }
  }
  validate.chainOf = fns;
  if (fns.length >= 2 && "type" in fns[0] && fns[0].type === "array" && !("each" in fns[1])) {
    throw new Error(`An assertValueType("array") validator can only be followed by an assertEach(...) validator.`);
  }
  return validate;
}
const validTypeOpts = ["aliases", "builder", "deprecatedAlias", "fields", "inherits", "visitor", "validate"];
const validFieldKeys = ["default", "optional", "deprecated", "validate"];
const store = {};
function defineAliasedType(...aliases) {
  return (type, opts = {}) => {
    let defined = opts.aliases;
    if (!defined) {
      var _store$opts$inherits$, _defined;
      if (opts.inherits) defined = (_store$opts$inherits$ = store[opts.inherits].aliases) == null ? void 0 : _store$opts$inherits$.slice();
      (_defined = defined) != null ? _defined : defined = [];
      opts.aliases = defined;
    }
    const additional = aliases.filter(a => !defined.includes(a));
    defined.unshift(...additional);
    defineType(type, opts);
  };
}
function defineType(type, opts = {}) {
  const inherits = opts.inherits && store[opts.inherits] || {};
  let fields = opts.fields;
  if (!fields) {
    fields = {};
    if (inherits.fields) {
      const keys = Object.getOwnPropertyNames(inherits.fields);
      for (const key of keys) {
        const field = inherits.fields[key];
        const def = field.default;
        if (Array.isArray(def) ? def.length > 0 : def && typeof def === "object") {
          throw new Error("field defaults can only be primitives or empty arrays currently");
        }
        fields[key] = {
          default: Array.isArray(def) ? [] : def,
          optional: field.optional,
          deprecated: field.deprecated,
          validate: field.validate
        };
      }
    }
  }
  const visitor = opts.visitor || inherits.visitor || [];
  const aliases = opts.aliases || inherits.aliases || [];
  const builder = opts.builder || inherits.builder || opts.visitor || [];
  for (const k of Object.keys(opts)) {
    if (validTypeOpts.indexOf(k) === -1) {
      throw new Error(`Unknown type option "${k}" on ${type}`);
    }
  }
  if (opts.deprecatedAlias) {
    DEPRECATED_KEYS[opts.deprecatedAlias] = type;
  }
  for (const key of visitor.concat(builder)) {
    fields[key] = fields[key] || {};
  }
  for (const key of Object.keys(fields)) {
    const field = fields[key];
    if (field.default !== undefined && builder.indexOf(key) === -1) {
      field.optional = true;
    }
    if (field.default === undefined) {
      field.default = null;
    } else if (!field.validate && field.default != null) {
      field.validate = assertValueType(getType(field.default));
    }
    for (const k of Object.keys(field)) {
      if (validFieldKeys.indexOf(k) === -1) {
        throw new Error(`Unknown field key "${k}" on ${type}.${key}`);
      }
    }
  }
  VISITOR_KEYS[type] = opts.visitor = visitor;
  BUILDER_KEYS[type] = opts.builder = builder;
  NODE_FIELDS[type] = opts.fields = fields;
  ALIAS_KEYS[type] = opts.aliases = aliases;
  aliases.forEach(alias => {
    FLIPPED_ALIAS_KEYS[alias] = FLIPPED_ALIAS_KEYS[alias] || [];
    FLIPPED_ALIAS_KEYS[alias].push(type);
  });
  if (opts.validate) {
    NODE_PARENT_VALIDATIONS[type] = opts.validate;
  }
  store[type] = opts;
}



}).call(this)}).call(this,require('_process'))
},{"../validators/is.js":87,"../validators/validate.js":105,"_process":116}],69:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  react: true,
  assertNode: true,
  createTypeAnnotationBasedOnTypeof: true,
  createUnionTypeAnnotation: true,
  createFlowUnionType: true,
  createTSUnionType: true,
  cloneNode: true,
  clone: true,
  cloneDeep: true,
  cloneDeepWithoutLoc: true,
  cloneWithoutLoc: true,
  addComment: true,
  addComments: true,
  inheritInnerComments: true,
  inheritLeadingComments: true,
  inheritsComments: true,
  inheritTrailingComments: true,
  removeComments: true,
  ensureBlock: true,
  toBindingIdentifierName: true,
  toBlock: true,
  toComputedKey: true,
  toExpression: true,
  toIdentifier: true,
  toKeyAlias: true,
  toStatement: true,
  valueToNode: true,
  appendToMemberExpression: true,
  inherits: true,
  prependToMemberExpression: true,
  removeProperties: true,
  removePropertiesDeep: true,
  removeTypeDuplicates: true,
  getBindingIdentifiers: true,
  getOuterBindingIdentifiers: true,
  traverse: true,
  traverseFast: true,
  shallowEqual: true,
  is: true,
  isBinding: true,
  isBlockScoped: true,
  isImmutable: true,
  isLet: true,
  isNode: true,
  isNodesEquivalent: true,
  isPlaceholderType: true,
  isReferenced: true,
  isScope: true,
  isSpecifierDefault: true,
  isType: true,
  isValidES3Identifier: true,
  isValidIdentifier: true,
  isVar: true,
  matchesPattern: true,
  validate: true,
  buildMatchMemberExpression: true,
  __internal__deprecationWarning: true
};
Object.defineProperty(exports, "__internal__deprecationWarning", {
  enumerable: true,
  get: function () {
    return _deprecationWarning.default;
  }
});
Object.defineProperty(exports, "addComment", {
  enumerable: true,
  get: function () {
    return _addComment.default;
  }
});
Object.defineProperty(exports, "addComments", {
  enumerable: true,
  get: function () {
    return _addComments.default;
  }
});
Object.defineProperty(exports, "appendToMemberExpression", {
  enumerable: true,
  get: function () {
    return _appendToMemberExpression.default;
  }
});
Object.defineProperty(exports, "assertNode", {
  enumerable: true,
  get: function () {
    return _assertNode.default;
  }
});
Object.defineProperty(exports, "buildMatchMemberExpression", {
  enumerable: true,
  get: function () {
    return _buildMatchMemberExpression.default;
  }
});
Object.defineProperty(exports, "clone", {
  enumerable: true,
  get: function () {
    return _clone.default;
  }
});
Object.defineProperty(exports, "cloneDeep", {
  enumerable: true,
  get: function () {
    return _cloneDeep.default;
  }
});
Object.defineProperty(exports, "cloneDeepWithoutLoc", {
  enumerable: true,
  get: function () {
    return _cloneDeepWithoutLoc.default;
  }
});
Object.defineProperty(exports, "cloneNode", {
  enumerable: true,
  get: function () {
    return _cloneNode.default;
  }
});
Object.defineProperty(exports, "cloneWithoutLoc", {
  enumerable: true,
  get: function () {
    return _cloneWithoutLoc.default;
  }
});
Object.defineProperty(exports, "createFlowUnionType", {
  enumerable: true,
  get: function () {
    return _createFlowUnionType.default;
  }
});
Object.defineProperty(exports, "createTSUnionType", {
  enumerable: true,
  get: function () {
    return _createTSUnionType.default;
  }
});
Object.defineProperty(exports, "createTypeAnnotationBasedOnTypeof", {
  enumerable: true,
  get: function () {
    return _createTypeAnnotationBasedOnTypeof.default;
  }
});
Object.defineProperty(exports, "createUnionTypeAnnotation", {
  enumerable: true,
  get: function () {
    return _createFlowUnionType.default;
  }
});
Object.defineProperty(exports, "ensureBlock", {
  enumerable: true,
  get: function () {
    return _ensureBlock.default;
  }
});
Object.defineProperty(exports, "getBindingIdentifiers", {
  enumerable: true,
  get: function () {
    return _getBindingIdentifiers.default;
  }
});
Object.defineProperty(exports, "getOuterBindingIdentifiers", {
  enumerable: true,
  get: function () {
    return _getOuterBindingIdentifiers.default;
  }
});
Object.defineProperty(exports, "inheritInnerComments", {
  enumerable: true,
  get: function () {
    return _inheritInnerComments.default;
  }
});
Object.defineProperty(exports, "inheritLeadingComments", {
  enumerable: true,
  get: function () {
    return _inheritLeadingComments.default;
  }
});
Object.defineProperty(exports, "inheritTrailingComments", {
  enumerable: true,
  get: function () {
    return _inheritTrailingComments.default;
  }
});
Object.defineProperty(exports, "inherits", {
  enumerable: true,
  get: function () {
    return _inherits.default;
  }
});
Object.defineProperty(exports, "inheritsComments", {
  enumerable: true,
  get: function () {
    return _inheritsComments.default;
  }
});
Object.defineProperty(exports, "is", {
  enumerable: true,
  get: function () {
    return _is.default;
  }
});
Object.defineProperty(exports, "isBinding", {
  enumerable: true,
  get: function () {
    return _isBinding.default;
  }
});
Object.defineProperty(exports, "isBlockScoped", {
  enumerable: true,
  get: function () {
    return _isBlockScoped.default;
  }
});
Object.defineProperty(exports, "isImmutable", {
  enumerable: true,
  get: function () {
    return _isImmutable.default;
  }
});
Object.defineProperty(exports, "isLet", {
  enumerable: true,
  get: function () {
    return _isLet.default;
  }
});
Object.defineProperty(exports, "isNode", {
  enumerable: true,
  get: function () {
    return _isNode.default;
  }
});
Object.defineProperty(exports, "isNodesEquivalent", {
  enumerable: true,
  get: function () {
    return _isNodesEquivalent.default;
  }
});
Object.defineProperty(exports, "isPlaceholderType", {
  enumerable: true,
  get: function () {
    return _isPlaceholderType.default;
  }
});
Object.defineProperty(exports, "isReferenced", {
  enumerable: true,
  get: function () {
    return _isReferenced.default;
  }
});
Object.defineProperty(exports, "isScope", {
  enumerable: true,
  get: function () {
    return _isScope.default;
  }
});
Object.defineProperty(exports, "isSpecifierDefault", {
  enumerable: true,
  get: function () {
    return _isSpecifierDefault.default;
  }
});
Object.defineProperty(exports, "isType", {
  enumerable: true,
  get: function () {
    return _isType.default;
  }
});
Object.defineProperty(exports, "isValidES3Identifier", {
  enumerable: true,
  get: function () {
    return _isValidES3Identifier.default;
  }
});
Object.defineProperty(exports, "isValidIdentifier", {
  enumerable: true,
  get: function () {
    return _isValidIdentifier.default;
  }
});
Object.defineProperty(exports, "isVar", {
  enumerable: true,
  get: function () {
    return _isVar.default;
  }
});
Object.defineProperty(exports, "matchesPattern", {
  enumerable: true,
  get: function () {
    return _matchesPattern.default;
  }
});
Object.defineProperty(exports, "prependToMemberExpression", {
  enumerable: true,
  get: function () {
    return _prependToMemberExpression.default;
  }
});
exports.react = void 0;
Object.defineProperty(exports, "removeComments", {
  enumerable: true,
  get: function () {
    return _removeComments.default;
  }
});
Object.defineProperty(exports, "removeProperties", {
  enumerable: true,
  get: function () {
    return _removeProperties.default;
  }
});
Object.defineProperty(exports, "removePropertiesDeep", {
  enumerable: true,
  get: function () {
    return _removePropertiesDeep.default;
  }
});
Object.defineProperty(exports, "removeTypeDuplicates", {
  enumerable: true,
  get: function () {
    return _removeTypeDuplicates.default;
  }
});
Object.defineProperty(exports, "shallowEqual", {
  enumerable: true,
  get: function () {
    return _shallowEqual.default;
  }
});
Object.defineProperty(exports, "toBindingIdentifierName", {
  enumerable: true,
  get: function () {
    return _toBindingIdentifierName.default;
  }
});
Object.defineProperty(exports, "toBlock", {
  enumerable: true,
  get: function () {
    return _toBlock.default;
  }
});
Object.defineProperty(exports, "toComputedKey", {
  enumerable: true,
  get: function () {
    return _toComputedKey.default;
  }
});
Object.defineProperty(exports, "toExpression", {
  enumerable: true,
  get: function () {
    return _toExpression.default;
  }
});
Object.defineProperty(exports, "toIdentifier", {
  enumerable: true,
  get: function () {
    return _toIdentifier.default;
  }
});
Object.defineProperty(exports, "toKeyAlias", {
  enumerable: true,
  get: function () {
    return _toKeyAlias.default;
  }
});
Object.defineProperty(exports, "toStatement", {
  enumerable: true,
  get: function () {
    return _toStatement.default;
  }
});
Object.defineProperty(exports, "traverse", {
  enumerable: true,
  get: function () {
    return _traverse.default;
  }
});
Object.defineProperty(exports, "traverseFast", {
  enumerable: true,
  get: function () {
    return _traverseFast.default;
  }
});
Object.defineProperty(exports, "validate", {
  enumerable: true,
  get: function () {
    return _validate.default;
  }
});
Object.defineProperty(exports, "valueToNode", {
  enumerable: true,
  get: function () {
    return _valueToNode.default;
  }
});
var _isReactComponent = require("./validators/react/isReactComponent.js");
var _isCompatTag = require("./validators/react/isCompatTag.js");
var _buildChildren = require("./builders/react/buildChildren.js");
var _assertNode = require("./asserts/assertNode.js");
var _index = require("./asserts/generated/index.js");
Object.keys(_index).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _index[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _index[key];
    }
  });
});
var _createTypeAnnotationBasedOnTypeof = require("./builders/flow/createTypeAnnotationBasedOnTypeof.js");
var _createFlowUnionType = require("./builders/flow/createFlowUnionType.js");
var _createTSUnionType = require("./builders/typescript/createTSUnionType.js");
var _index2 = require("./builders/generated/index.js");
Object.keys(_index2).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _index2[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _index2[key];
    }
  });
});
var _uppercase = require("./builders/generated/uppercase.js");
Object.keys(_uppercase).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _uppercase[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _uppercase[key];
    }
  });
});
var _productions = require("./builders/productions.js");
Object.keys(_productions).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _productions[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _productions[key];
    }
  });
});
var _cloneNode = require("./clone/cloneNode.js");
var _clone = require("./clone/clone.js");
var _cloneDeep = require("./clone/cloneDeep.js");
var _cloneDeepWithoutLoc = require("./clone/cloneDeepWithoutLoc.js");
var _cloneWithoutLoc = require("./clone/cloneWithoutLoc.js");
var _addComment = require("./comments/addComment.js");
var _addComments = require("./comments/addComments.js");
var _inheritInnerComments = require("./comments/inheritInnerComments.js");
var _inheritLeadingComments = require("./comments/inheritLeadingComments.js");
var _inheritsComments = require("./comments/inheritsComments.js");
var _inheritTrailingComments = require("./comments/inheritTrailingComments.js");
var _removeComments = require("./comments/removeComments.js");
var _index3 = require("./constants/generated/index.js");
Object.keys(_index3).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _index3[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _index3[key];
    }
  });
});
var _index4 = require("./constants/index.js");
Object.keys(_index4).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _index4[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _index4[key];
    }
  });
});
var _ensureBlock = require("./converters/ensureBlock.js");
var _toBindingIdentifierName = require("./converters/toBindingIdentifierName.js");
var _toBlock = require("./converters/toBlock.js");
var _toComputedKey = require("./converters/toComputedKey.js");
var _toExpression = require("./converters/toExpression.js");
var _toIdentifier = require("./converters/toIdentifier.js");
var _toKeyAlias = require("./converters/toKeyAlias.js");
var _toStatement = require("./converters/toStatement.js");
var _valueToNode = require("./converters/valueToNode.js");
var _index5 = require("./definitions/index.js");
Object.keys(_index5).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _index5[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _index5[key];
    }
  });
});
var _appendToMemberExpression = require("./modifications/appendToMemberExpression.js");
var _inherits = require("./modifications/inherits.js");
var _prependToMemberExpression = require("./modifications/prependToMemberExpression.js");
var _removeProperties = require("./modifications/removeProperties.js");
var _removePropertiesDeep = require("./modifications/removePropertiesDeep.js");
var _removeTypeDuplicates = require("./modifications/flow/removeTypeDuplicates.js");
var _getBindingIdentifiers = require("./retrievers/getBindingIdentifiers.js");
var _getOuterBindingIdentifiers = require("./retrievers/getOuterBindingIdentifiers.js");
var _traverse = require("./traverse/traverse.js");
Object.keys(_traverse).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _traverse[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _traverse[key];
    }
  });
});
var _traverseFast = require("./traverse/traverseFast.js");
var _shallowEqual = require("./utils/shallowEqual.js");
var _is = require("./validators/is.js");
var _isBinding = require("./validators/isBinding.js");
var _isBlockScoped = require("./validators/isBlockScoped.js");
var _isImmutable = require("./validators/isImmutable.js");
var _isLet = require("./validators/isLet.js");
var _isNode = require("./validators/isNode.js");
var _isNodesEquivalent = require("./validators/isNodesEquivalent.js");
var _isPlaceholderType = require("./validators/isPlaceholderType.js");
var _isReferenced = require("./validators/isReferenced.js");
var _isScope = require("./validators/isScope.js");
var _isSpecifierDefault = require("./validators/isSpecifierDefault.js");
var _isType = require("./validators/isType.js");
var _isValidES3Identifier = require("./validators/isValidES3Identifier.js");
var _isValidIdentifier = require("./validators/isValidIdentifier.js");
var _isVar = require("./validators/isVar.js");
var _matchesPattern = require("./validators/matchesPattern.js");
var _validate = require("./validators/validate.js");
var _buildMatchMemberExpression = require("./validators/buildMatchMemberExpression.js");
var _index6 = require("./validators/generated/index.js");
Object.keys(_index6).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _index6[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _index6[key];
    }
  });
});
var _deprecationWarning = require("./utils/deprecationWarning.js");
const react = exports.react = {
  isReactComponent: _isReactComponent.default,
  isCompatTag: _isCompatTag.default,
  buildChildren: _buildChildren.default
};
{
  exports.toSequenceExpression = require("./converters/toSequenceExpression.js").default;
}



},{"./asserts/assertNode.js":24,"./asserts/generated/index.js":25,"./builders/flow/createFlowUnionType.js":26,"./builders/flow/createTypeAnnotationBasedOnTypeof.js":27,"./builders/generated/index.js":28,"./builders/generated/uppercase.js":29,"./builders/productions.js":30,"./builders/react/buildChildren.js":31,"./builders/typescript/createTSUnionType.js":32,"./clone/clone.js":34,"./clone/cloneDeep.js":35,"./clone/cloneDeepWithoutLoc.js":36,"./clone/cloneNode.js":37,"./clone/cloneWithoutLoc.js":38,"./comments/addComment.js":39,"./comments/addComments.js":40,"./comments/inheritInnerComments.js":41,"./comments/inheritLeadingComments.js":42,"./comments/inheritTrailingComments.js":43,"./comments/inheritsComments.js":44,"./comments/removeComments.js":45,"./constants/generated/index.js":46,"./constants/index.js":47,"./converters/ensureBlock.js":48,"./converters/toBindingIdentifierName.js":50,"./converters/toBlock.js":51,"./converters/toComputedKey.js":52,"./converters/toExpression.js":53,"./converters/toIdentifier.js":54,"./converters/toKeyAlias.js":55,"./converters/toSequenceExpression.js":56,"./converters/toStatement.js":57,"./converters/valueToNode.js":58,"./definitions/index.js":63,"./modifications/appendToMemberExpression.js":70,"./modifications/flow/removeTypeDuplicates.js":71,"./modifications/inherits.js":72,"./modifications/prependToMemberExpression.js":73,"./modifications/removeProperties.js":74,"./modifications/removePropertiesDeep.js":75,"./retrievers/getBindingIdentifiers.js":77,"./retrievers/getOuterBindingIdentifiers.js":78,"./traverse/traverse.js":79,"./traverse/traverseFast.js":80,"./utils/deprecationWarning.js":81,"./utils/shallowEqual.js":84,"./validators/buildMatchMemberExpression.js":85,"./validators/generated/index.js":86,"./validators/is.js":87,"./validators/isBinding.js":88,"./validators/isBlockScoped.js":89,"./validators/isImmutable.js":90,"./validators/isLet.js":91,"./validators/isNode.js":92,"./validators/isNodesEquivalent.js":93,"./validators/isPlaceholderType.js":94,"./validators/isReferenced.js":95,"./validators/isScope.js":96,"./validators/isSpecifierDefault.js":97,"./validators/isType.js":98,"./validators/isValidES3Identifier.js":99,"./validators/isValidIdentifier.js":100,"./validators/isVar.js":101,"./validators/matchesPattern.js":102,"./validators/react/isCompatTag.js":103,"./validators/react/isReactComponent.js":104,"./validators/validate.js":105}],70:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = appendToMemberExpression;
var _index = require("../builders/generated/index.js");
function appendToMemberExpression(member, append, computed = false) {
  member.object = (0, _index.memberExpression)(member.object, member.property, member.computed);
  member.property = append;
  member.computed = !!computed;
  return member;
}



},{"../builders/generated/index.js":28}],71:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = removeTypeDuplicates;
var _index = require("../../validators/generated/index.js");
function getQualifiedName(node) {
  return (0, _index.isIdentifier)(node) ? node.name : `${node.id.name}.${getQualifiedName(node.qualification)}`;
}
function removeTypeDuplicates(nodesIn) {
  const nodes = Array.from(nodesIn);
  const generics = new Map();
  const bases = new Map();
  const typeGroups = new Set();
  const types = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!node) continue;
    if (types.indexOf(node) >= 0) {
      continue;
    }
    if ((0, _index.isAnyTypeAnnotation)(node)) {
      return [node];
    }
    if ((0, _index.isFlowBaseAnnotation)(node)) {
      bases.set(node.type, node);
      continue;
    }
    if ((0, _index.isUnionTypeAnnotation)(node)) {
      if (!typeGroups.has(node.types)) {
        nodes.push(...node.types);
        typeGroups.add(node.types);
      }
      continue;
    }
    if ((0, _index.isGenericTypeAnnotation)(node)) {
      const name = getQualifiedName(node.id);
      if (generics.has(name)) {
        let existing = generics.get(name);
        if (existing.typeParameters) {
          if (node.typeParameters) {
            existing.typeParameters.params.push(...node.typeParameters.params);
            existing.typeParameters.params = removeTypeDuplicates(existing.typeParameters.params);
          }
        } else {
          existing = node.typeParameters;
        }
      } else {
        generics.set(name, node);
      }
      continue;
    }
    types.push(node);
  }
  for (const [, baseType] of bases) {
    types.push(baseType);
  }
  for (const [, genericName] of generics) {
    types.push(genericName);
  }
  return types;
}



},{"../../validators/generated/index.js":86}],72:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = inherits;
var _index = require("../constants/index.js");
var _inheritsComments = require("../comments/inheritsComments.js");
function inherits(child, parent) {
  if (!child || !parent) return child;
  for (const key of _index.INHERIT_KEYS.optional) {
    if (child[key] == null) {
      child[key] = parent[key];
    }
  }
  for (const key of Object.keys(parent)) {
    if (key[0] === "_" && key !== "__clone") {
      child[key] = parent[key];
    }
  }
  for (const key of _index.INHERIT_KEYS.force) {
    child[key] = parent[key];
  }
  (0, _inheritsComments.default)(child, parent);
  return child;
}



},{"../comments/inheritsComments.js":44,"../constants/index.js":47}],73:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = prependToMemberExpression;
var _index = require("../builders/generated/index.js");
var _index2 = require("../index.js");
function prependToMemberExpression(member, prepend) {
  if ((0, _index2.isSuper)(member.object)) {
    throw new Error("Cannot prepend node to super property access (`super.foo`).");
  }
  member.object = (0, _index.memberExpression)(prepend, member.object);
  return member;
}



},{"../builders/generated/index.js":28,"../index.js":69}],74:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = removeProperties;
var _index = require("../constants/index.js");
const CLEAR_KEYS = ["tokens", "start", "end", "loc", "raw", "rawValue"];
const CLEAR_KEYS_PLUS_COMMENTS = [..._index.COMMENT_KEYS, "comments", ...CLEAR_KEYS];
function removeProperties(node, opts = {}) {
  const map = opts.preserveComments ? CLEAR_KEYS : CLEAR_KEYS_PLUS_COMMENTS;
  for (const key of map) {
    if (node[key] != null) node[key] = undefined;
  }
  for (const key of Object.keys(node)) {
    if (key[0] === "_" && node[key] != null) node[key] = undefined;
  }
  const symbols = Object.getOwnPropertySymbols(node);
  for (const sym of symbols) {
    node[sym] = null;
  }
}



},{"../constants/index.js":47}],75:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = removePropertiesDeep;
var _traverseFast = require("../traverse/traverseFast.js");
var _removeProperties = require("./removeProperties.js");
function removePropertiesDeep(tree, opts) {
  (0, _traverseFast.default)(tree, _removeProperties.default, opts);
  return tree;
}



},{"../traverse/traverseFast.js":80,"./removeProperties.js":74}],76:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = removeTypeDuplicates;
var _index = require("../../validators/generated/index.js");
function getQualifiedName(node) {
  return (0, _index.isIdentifier)(node) ? node.name : `${node.right.name}.${getQualifiedName(node.left)}`;
}
function removeTypeDuplicates(nodesIn) {
  const nodes = Array.from(nodesIn);
  const generics = new Map();
  const bases = new Map();
  const typeGroups = new Set();
  const types = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!node) continue;
    if (types.indexOf(node) >= 0) {
      continue;
    }
    if ((0, _index.isTSAnyKeyword)(node)) {
      return [node];
    }
    if ((0, _index.isTSBaseType)(node)) {
      bases.set(node.type, node);
      continue;
    }
    if ((0, _index.isTSUnionType)(node)) {
      if (!typeGroups.has(node.types)) {
        nodes.push(...node.types);
        typeGroups.add(node.types);
      }
      continue;
    }
    if ((0, _index.isTSTypeReference)(node) && node.typeParameters) {
      const name = getQualifiedName(node.typeName);
      if (generics.has(name)) {
        let existing = generics.get(name);
        if (existing.typeParameters) {
          if (node.typeParameters) {
            existing.typeParameters.params.push(...node.typeParameters.params);
            existing.typeParameters.params = removeTypeDuplicates(existing.typeParameters.params);
          }
        } else {
          existing = node.typeParameters;
        }
      } else {
        generics.set(name, node);
      }
      continue;
    }
    types.push(node);
  }
  for (const [, baseType] of bases) {
    types.push(baseType);
  }
  for (const [, genericName] of generics) {
    types.push(genericName);
  }
  return types;
}



},{"../../validators/generated/index.js":86}],77:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getBindingIdentifiers;
var _index = require("../validators/generated/index.js");
function getBindingIdentifiers(node, duplicates, outerOnly, newBindingsOnly) {
  const search = [].concat(node);
  const ids = Object.create(null);
  while (search.length) {
    const id = search.shift();
    if (!id) continue;
    if (newBindingsOnly && ((0, _index.isAssignmentExpression)(id) || (0, _index.isUnaryExpression)(id))) {
      continue;
    }
    const keys = getBindingIdentifiers.keys[id.type];
    if ((0, _index.isIdentifier)(id)) {
      if (duplicates) {
        const _ids = ids[id.name] = ids[id.name] || [];
        _ids.push(id);
      } else {
        ids[id.name] = id;
      }
      continue;
    }
    if ((0, _index.isExportDeclaration)(id) && !(0, _index.isExportAllDeclaration)(id)) {
      if ((0, _index.isDeclaration)(id.declaration)) {
        search.push(id.declaration);
      }
      continue;
    }
    if (outerOnly) {
      if ((0, _index.isFunctionDeclaration)(id)) {
        search.push(id.id);
        continue;
      }
      if ((0, _index.isFunctionExpression)(id)) {
        continue;
      }
    }
    if (keys) {
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const nodes = id[key];
        if (nodes) {
          Array.isArray(nodes) ? search.push(...nodes) : search.push(nodes);
        }
      }
    }
  }
  return ids;
}
getBindingIdentifiers.keys = {
  DeclareClass: ["id"],
  DeclareFunction: ["id"],
  DeclareModule: ["id"],
  DeclareVariable: ["id"],
  DeclareInterface: ["id"],
  DeclareTypeAlias: ["id"],
  DeclareOpaqueType: ["id"],
  InterfaceDeclaration: ["id"],
  TypeAlias: ["id"],
  OpaqueType: ["id"],
  CatchClause: ["param"],
  LabeledStatement: ["label"],
  UnaryExpression: ["argument"],
  AssignmentExpression: ["left"],
  ImportSpecifier: ["local"],
  ImportNamespaceSpecifier: ["local"],
  ImportDefaultSpecifier: ["local"],
  ImportDeclaration: ["specifiers"],
  ExportSpecifier: ["exported"],
  ExportNamespaceSpecifier: ["exported"],
  ExportDefaultSpecifier: ["exported"],
  FunctionDeclaration: ["id", "params"],
  FunctionExpression: ["id", "params"],
  ArrowFunctionExpression: ["params"],
  ObjectMethod: ["params"],
  ClassMethod: ["params"],
  ClassPrivateMethod: ["params"],
  ForInStatement: ["left"],
  ForOfStatement: ["left"],
  ClassDeclaration: ["id"],
  ClassExpression: ["id"],
  RestElement: ["argument"],
  UpdateExpression: ["argument"],
  ObjectProperty: ["value"],
  AssignmentPattern: ["left"],
  ArrayPattern: ["elements"],
  ObjectPattern: ["properties"],
  VariableDeclaration: ["declarations"],
  VariableDeclarator: ["id"]
};



},{"../validators/generated/index.js":86}],78:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _getBindingIdentifiers = require("./getBindingIdentifiers.js");
var _default = exports.default = getOuterBindingIdentifiers;
function getOuterBindingIdentifiers(node, duplicates) {
  return (0, _getBindingIdentifiers.default)(node, duplicates, true);
}



},{"./getBindingIdentifiers.js":77}],79:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = traverse;
var _index = require("../definitions/index.js");
function traverse(node, handlers, state) {
  if (typeof handlers === "function") {
    handlers = {
      enter: handlers
    };
  }
  const {
    enter,
    exit
  } = handlers;
  traverseSimpleImpl(node, enter, exit, state, []);
}
function traverseSimpleImpl(node, enter, exit, state, ancestors) {
  const keys = _index.VISITOR_KEYS[node.type];
  if (!keys) return;
  if (enter) enter(node, ancestors, state);
  for (const key of keys) {
    const subNode = node[key];
    if (Array.isArray(subNode)) {
      for (let i = 0; i < subNode.length; i++) {
        const child = subNode[i];
        if (!child) continue;
        ancestors.push({
          node,
          key,
          index: i
        });
        traverseSimpleImpl(child, enter, exit, state, ancestors);
        ancestors.pop();
      }
    } else if (subNode) {
      ancestors.push({
        node,
        key
      });
      traverseSimpleImpl(subNode, enter, exit, state, ancestors);
      ancestors.pop();
    }
  }
  if (exit) exit(node, ancestors, state);
}



},{"../definitions/index.js":63}],80:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = traverseFast;
var _index = require("../definitions/index.js");
function traverseFast(node, enter, opts) {
  if (!node) return;
  const keys = _index.VISITOR_KEYS[node.type];
  if (!keys) return;
  opts = opts || {};
  enter(node, opts);
  for (const key of keys) {
    const subNode = node[key];
    if (Array.isArray(subNode)) {
      for (const node of subNode) {
        traverseFast(node, enter, opts);
      }
    } else {
      traverseFast(subNode, enter, opts);
    }
  }
}



},{"../definitions/index.js":63}],81:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = deprecationWarning;
const warnings = new Set();
function deprecationWarning(oldName, newName, prefix = "") {
  if (warnings.has(oldName)) return;
  warnings.add(oldName);
  const {
    internal,
    trace
  } = captureShortStackTrace(1, 2);
  if (internal) {
    return;
  }
  console.warn(`${prefix}\`${oldName}\` has been deprecated, please migrate to \`${newName}\`\n${trace}`);
}
function captureShortStackTrace(skip, length) {
  const {
    stackTraceLimit,
    prepareStackTrace
  } = Error;
  let stackTrace;
  Error.stackTraceLimit = 1 + skip + length;
  Error.prepareStackTrace = function (err, stack) {
    stackTrace = stack;
  };
  new Error().stack;
  Error.stackTraceLimit = stackTraceLimit;
  Error.prepareStackTrace = prepareStackTrace;
  if (!stackTrace) return {
    internal: false,
    trace: ""
  };
  const shortStackTrace = stackTrace.slice(1 + skip, 1 + skip + length);
  return {
    internal: /[\\/]@babel[\\/]/.test(shortStackTrace[1].getFileName()),
    trace: shortStackTrace.map(frame => `    at ${frame}`).join("\n")
  };
}



},{}],82:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = inherit;
function inherit(key, child, parent) {
  if (child && parent) {
    child[key] = Array.from(new Set([].concat(child[key], parent[key]).filter(Boolean)));
  }
}



},{}],83:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = cleanJSXElementLiteralChild;
var _index = require("../../builders/generated/index.js");
var _index2 = require("../../index.js");
function cleanJSXElementLiteralChild(child, args) {
  const lines = child.value.split(/\r\n|\n|\r/);
  let lastNonEmptyLine = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/[^ \t]/)) {
      lastNonEmptyLine = i;
    }
  }
  let str = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isFirstLine = i === 0;
    const isLastLine = i === lines.length - 1;
    const isLastNonEmptyLine = i === lastNonEmptyLine;
    let trimmedLine = line.replace(/\t/g, " ");
    if (!isFirstLine) {
      trimmedLine = trimmedLine.replace(/^[ ]+/, "");
    }
    if (!isLastLine) {
      trimmedLine = trimmedLine.replace(/[ ]+$/, "");
    }
    if (trimmedLine) {
      if (!isLastNonEmptyLine) {
        trimmedLine += " ";
      }
      str += trimmedLine;
    }
  }
  if (str) args.push((0, _index2.inherits)((0, _index.stringLiteral)(str), child));
}



},{"../../builders/generated/index.js":28,"../../index.js":69}],84:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = shallowEqual;
function shallowEqual(actual, expected) {
  const keys = Object.keys(expected);
  for (const key of keys) {
    if (actual[key] !== expected[key]) {
      return false;
    }
  }
  return true;
}



},{}],85:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = buildMatchMemberExpression;
var _matchesPattern = require("./matchesPattern.js");
function buildMatchMemberExpression(match, allowPartial) {
  const parts = match.split(".");
  return member => (0, _matchesPattern.default)(member, parts, allowPartial);
}



},{"./matchesPattern.js":102}],86:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isAccessor = isAccessor;
exports.isAnyTypeAnnotation = isAnyTypeAnnotation;
exports.isArgumentPlaceholder = isArgumentPlaceholder;
exports.isArrayExpression = isArrayExpression;
exports.isArrayPattern = isArrayPattern;
exports.isArrayTypeAnnotation = isArrayTypeAnnotation;
exports.isArrowFunctionExpression = isArrowFunctionExpression;
exports.isAssignmentExpression = isAssignmentExpression;
exports.isAssignmentPattern = isAssignmentPattern;
exports.isAwaitExpression = isAwaitExpression;
exports.isBigIntLiteral = isBigIntLiteral;
exports.isBinary = isBinary;
exports.isBinaryExpression = isBinaryExpression;
exports.isBindExpression = isBindExpression;
exports.isBlock = isBlock;
exports.isBlockParent = isBlockParent;
exports.isBlockStatement = isBlockStatement;
exports.isBooleanLiteral = isBooleanLiteral;
exports.isBooleanLiteralTypeAnnotation = isBooleanLiteralTypeAnnotation;
exports.isBooleanTypeAnnotation = isBooleanTypeAnnotation;
exports.isBreakStatement = isBreakStatement;
exports.isCallExpression = isCallExpression;
exports.isCatchClause = isCatchClause;
exports.isClass = isClass;
exports.isClassAccessorProperty = isClassAccessorProperty;
exports.isClassBody = isClassBody;
exports.isClassDeclaration = isClassDeclaration;
exports.isClassExpression = isClassExpression;
exports.isClassImplements = isClassImplements;
exports.isClassMethod = isClassMethod;
exports.isClassPrivateMethod = isClassPrivateMethod;
exports.isClassPrivateProperty = isClassPrivateProperty;
exports.isClassProperty = isClassProperty;
exports.isCompletionStatement = isCompletionStatement;
exports.isConditional = isConditional;
exports.isConditionalExpression = isConditionalExpression;
exports.isContinueStatement = isContinueStatement;
exports.isDebuggerStatement = isDebuggerStatement;
exports.isDecimalLiteral = isDecimalLiteral;
exports.isDeclaration = isDeclaration;
exports.isDeclareClass = isDeclareClass;
exports.isDeclareExportAllDeclaration = isDeclareExportAllDeclaration;
exports.isDeclareExportDeclaration = isDeclareExportDeclaration;
exports.isDeclareFunction = isDeclareFunction;
exports.isDeclareInterface = isDeclareInterface;
exports.isDeclareModule = isDeclareModule;
exports.isDeclareModuleExports = isDeclareModuleExports;
exports.isDeclareOpaqueType = isDeclareOpaqueType;
exports.isDeclareTypeAlias = isDeclareTypeAlias;
exports.isDeclareVariable = isDeclareVariable;
exports.isDeclaredPredicate = isDeclaredPredicate;
exports.isDecorator = isDecorator;
exports.isDirective = isDirective;
exports.isDirectiveLiteral = isDirectiveLiteral;
exports.isDoExpression = isDoExpression;
exports.isDoWhileStatement = isDoWhileStatement;
exports.isEmptyStatement = isEmptyStatement;
exports.isEmptyTypeAnnotation = isEmptyTypeAnnotation;
exports.isEnumBody = isEnumBody;
exports.isEnumBooleanBody = isEnumBooleanBody;
exports.isEnumBooleanMember = isEnumBooleanMember;
exports.isEnumDeclaration = isEnumDeclaration;
exports.isEnumDefaultedMember = isEnumDefaultedMember;
exports.isEnumMember = isEnumMember;
exports.isEnumNumberBody = isEnumNumberBody;
exports.isEnumNumberMember = isEnumNumberMember;
exports.isEnumStringBody = isEnumStringBody;
exports.isEnumStringMember = isEnumStringMember;
exports.isEnumSymbolBody = isEnumSymbolBody;
exports.isExistsTypeAnnotation = isExistsTypeAnnotation;
exports.isExportAllDeclaration = isExportAllDeclaration;
exports.isExportDeclaration = isExportDeclaration;
exports.isExportDefaultDeclaration = isExportDefaultDeclaration;
exports.isExportDefaultSpecifier = isExportDefaultSpecifier;
exports.isExportNamedDeclaration = isExportNamedDeclaration;
exports.isExportNamespaceSpecifier = isExportNamespaceSpecifier;
exports.isExportSpecifier = isExportSpecifier;
exports.isExpression = isExpression;
exports.isExpressionStatement = isExpressionStatement;
exports.isExpressionWrapper = isExpressionWrapper;
exports.isFile = isFile;
exports.isFlow = isFlow;
exports.isFlowBaseAnnotation = isFlowBaseAnnotation;
exports.isFlowDeclaration = isFlowDeclaration;
exports.isFlowPredicate = isFlowPredicate;
exports.isFlowType = isFlowType;
exports.isFor = isFor;
exports.isForInStatement = isForInStatement;
exports.isForOfStatement = isForOfStatement;
exports.isForStatement = isForStatement;
exports.isForXStatement = isForXStatement;
exports.isFunction = isFunction;
exports.isFunctionDeclaration = isFunctionDeclaration;
exports.isFunctionExpression = isFunctionExpression;
exports.isFunctionParent = isFunctionParent;
exports.isFunctionTypeAnnotation = isFunctionTypeAnnotation;
exports.isFunctionTypeParam = isFunctionTypeParam;
exports.isGenericTypeAnnotation = isGenericTypeAnnotation;
exports.isIdentifier = isIdentifier;
exports.isIfStatement = isIfStatement;
exports.isImmutable = isImmutable;
exports.isImport = isImport;
exports.isImportAttribute = isImportAttribute;
exports.isImportDeclaration = isImportDeclaration;
exports.isImportDefaultSpecifier = isImportDefaultSpecifier;
exports.isImportExpression = isImportExpression;
exports.isImportNamespaceSpecifier = isImportNamespaceSpecifier;
exports.isImportOrExportDeclaration = isImportOrExportDeclaration;
exports.isImportSpecifier = isImportSpecifier;
exports.isIndexedAccessType = isIndexedAccessType;
exports.isInferredPredicate = isInferredPredicate;
exports.isInterfaceDeclaration = isInterfaceDeclaration;
exports.isInterfaceExtends = isInterfaceExtends;
exports.isInterfaceTypeAnnotation = isInterfaceTypeAnnotation;
exports.isInterpreterDirective = isInterpreterDirective;
exports.isIntersectionTypeAnnotation = isIntersectionTypeAnnotation;
exports.isJSX = isJSX;
exports.isJSXAttribute = isJSXAttribute;
exports.isJSXClosingElement = isJSXClosingElement;
exports.isJSXClosingFragment = isJSXClosingFragment;
exports.isJSXElement = isJSXElement;
exports.isJSXEmptyExpression = isJSXEmptyExpression;
exports.isJSXExpressionContainer = isJSXExpressionContainer;
exports.isJSXFragment = isJSXFragment;
exports.isJSXIdentifier = isJSXIdentifier;
exports.isJSXMemberExpression = isJSXMemberExpression;
exports.isJSXNamespacedName = isJSXNamespacedName;
exports.isJSXOpeningElement = isJSXOpeningElement;
exports.isJSXOpeningFragment = isJSXOpeningFragment;
exports.isJSXSpreadAttribute = isJSXSpreadAttribute;
exports.isJSXSpreadChild = isJSXSpreadChild;
exports.isJSXText = isJSXText;
exports.isLVal = isLVal;
exports.isLabeledStatement = isLabeledStatement;
exports.isLiteral = isLiteral;
exports.isLogicalExpression = isLogicalExpression;
exports.isLoop = isLoop;
exports.isMemberExpression = isMemberExpression;
exports.isMetaProperty = isMetaProperty;
exports.isMethod = isMethod;
exports.isMiscellaneous = isMiscellaneous;
exports.isMixedTypeAnnotation = isMixedTypeAnnotation;
exports.isModuleDeclaration = isModuleDeclaration;
exports.isModuleExpression = isModuleExpression;
exports.isModuleSpecifier = isModuleSpecifier;
exports.isNewExpression = isNewExpression;
exports.isNoop = isNoop;
exports.isNullLiteral = isNullLiteral;
exports.isNullLiteralTypeAnnotation = isNullLiteralTypeAnnotation;
exports.isNullableTypeAnnotation = isNullableTypeAnnotation;
exports.isNumberLiteral = isNumberLiteral;
exports.isNumberLiteralTypeAnnotation = isNumberLiteralTypeAnnotation;
exports.isNumberTypeAnnotation = isNumberTypeAnnotation;
exports.isNumericLiteral = isNumericLiteral;
exports.isObjectExpression = isObjectExpression;
exports.isObjectMember = isObjectMember;
exports.isObjectMethod = isObjectMethod;
exports.isObjectPattern = isObjectPattern;
exports.isObjectProperty = isObjectProperty;
exports.isObjectTypeAnnotation = isObjectTypeAnnotation;
exports.isObjectTypeCallProperty = isObjectTypeCallProperty;
exports.isObjectTypeIndexer = isObjectTypeIndexer;
exports.isObjectTypeInternalSlot = isObjectTypeInternalSlot;
exports.isObjectTypeProperty = isObjectTypeProperty;
exports.isObjectTypeSpreadProperty = isObjectTypeSpreadProperty;
exports.isOpaqueType = isOpaqueType;
exports.isOptionalCallExpression = isOptionalCallExpression;
exports.isOptionalIndexedAccessType = isOptionalIndexedAccessType;
exports.isOptionalMemberExpression = isOptionalMemberExpression;
exports.isParenthesizedExpression = isParenthesizedExpression;
exports.isPattern = isPattern;
exports.isPatternLike = isPatternLike;
exports.isPipelineBareFunction = isPipelineBareFunction;
exports.isPipelinePrimaryTopicReference = isPipelinePrimaryTopicReference;
exports.isPipelineTopicExpression = isPipelineTopicExpression;
exports.isPlaceholder = isPlaceholder;
exports.isPrivate = isPrivate;
exports.isPrivateName = isPrivateName;
exports.isProgram = isProgram;
exports.isProperty = isProperty;
exports.isPureish = isPureish;
exports.isQualifiedTypeIdentifier = isQualifiedTypeIdentifier;
exports.isRecordExpression = isRecordExpression;
exports.isRegExpLiteral = isRegExpLiteral;
exports.isRegexLiteral = isRegexLiteral;
exports.isRestElement = isRestElement;
exports.isRestProperty = isRestProperty;
exports.isReturnStatement = isReturnStatement;
exports.isScopable = isScopable;
exports.isSequenceExpression = isSequenceExpression;
exports.isSpreadElement = isSpreadElement;
exports.isSpreadProperty = isSpreadProperty;
exports.isStandardized = isStandardized;
exports.isStatement = isStatement;
exports.isStaticBlock = isStaticBlock;
exports.isStringLiteral = isStringLiteral;
exports.isStringLiteralTypeAnnotation = isStringLiteralTypeAnnotation;
exports.isStringTypeAnnotation = isStringTypeAnnotation;
exports.isSuper = isSuper;
exports.isSwitchCase = isSwitchCase;
exports.isSwitchStatement = isSwitchStatement;
exports.isSymbolTypeAnnotation = isSymbolTypeAnnotation;
exports.isTSAnyKeyword = isTSAnyKeyword;
exports.isTSArrayType = isTSArrayType;
exports.isTSAsExpression = isTSAsExpression;
exports.isTSBaseType = isTSBaseType;
exports.isTSBigIntKeyword = isTSBigIntKeyword;
exports.isTSBooleanKeyword = isTSBooleanKeyword;
exports.isTSCallSignatureDeclaration = isTSCallSignatureDeclaration;
exports.isTSConditionalType = isTSConditionalType;
exports.isTSConstructSignatureDeclaration = isTSConstructSignatureDeclaration;
exports.isTSConstructorType = isTSConstructorType;
exports.isTSDeclareFunction = isTSDeclareFunction;
exports.isTSDeclareMethod = isTSDeclareMethod;
exports.isTSEntityName = isTSEntityName;
exports.isTSEnumDeclaration = isTSEnumDeclaration;
exports.isTSEnumMember = isTSEnumMember;
exports.isTSExportAssignment = isTSExportAssignment;
exports.isTSExpressionWithTypeArguments = isTSExpressionWithTypeArguments;
exports.isTSExternalModuleReference = isTSExternalModuleReference;
exports.isTSFunctionType = isTSFunctionType;
exports.isTSImportEqualsDeclaration = isTSImportEqualsDeclaration;
exports.isTSImportType = isTSImportType;
exports.isTSIndexSignature = isTSIndexSignature;
exports.isTSIndexedAccessType = isTSIndexedAccessType;
exports.isTSInferType = isTSInferType;
exports.isTSInstantiationExpression = isTSInstantiationExpression;
exports.isTSInterfaceBody = isTSInterfaceBody;
exports.isTSInterfaceDeclaration = isTSInterfaceDeclaration;
exports.isTSIntersectionType = isTSIntersectionType;
exports.isTSIntrinsicKeyword = isTSIntrinsicKeyword;
exports.isTSLiteralType = isTSLiteralType;
exports.isTSMappedType = isTSMappedType;
exports.isTSMethodSignature = isTSMethodSignature;
exports.isTSModuleBlock = isTSModuleBlock;
exports.isTSModuleDeclaration = isTSModuleDeclaration;
exports.isTSNamedTupleMember = isTSNamedTupleMember;
exports.isTSNamespaceExportDeclaration = isTSNamespaceExportDeclaration;
exports.isTSNeverKeyword = isTSNeverKeyword;
exports.isTSNonNullExpression = isTSNonNullExpression;
exports.isTSNullKeyword = isTSNullKeyword;
exports.isTSNumberKeyword = isTSNumberKeyword;
exports.isTSObjectKeyword = isTSObjectKeyword;
exports.isTSOptionalType = isTSOptionalType;
exports.isTSParameterProperty = isTSParameterProperty;
exports.isTSParenthesizedType = isTSParenthesizedType;
exports.isTSPropertySignature = isTSPropertySignature;
exports.isTSQualifiedName = isTSQualifiedName;
exports.isTSRestType = isTSRestType;
exports.isTSSatisfiesExpression = isTSSatisfiesExpression;
exports.isTSStringKeyword = isTSStringKeyword;
exports.isTSSymbolKeyword = isTSSymbolKeyword;
exports.isTSThisType = isTSThisType;
exports.isTSTupleType = isTSTupleType;
exports.isTSType = isTSType;
exports.isTSTypeAliasDeclaration = isTSTypeAliasDeclaration;
exports.isTSTypeAnnotation = isTSTypeAnnotation;
exports.isTSTypeAssertion = isTSTypeAssertion;
exports.isTSTypeElement = isTSTypeElement;
exports.isTSTypeLiteral = isTSTypeLiteral;
exports.isTSTypeOperator = isTSTypeOperator;
exports.isTSTypeParameter = isTSTypeParameter;
exports.isTSTypeParameterDeclaration = isTSTypeParameterDeclaration;
exports.isTSTypeParameterInstantiation = isTSTypeParameterInstantiation;
exports.isTSTypePredicate = isTSTypePredicate;
exports.isTSTypeQuery = isTSTypeQuery;
exports.isTSTypeReference = isTSTypeReference;
exports.isTSUndefinedKeyword = isTSUndefinedKeyword;
exports.isTSUnionType = isTSUnionType;
exports.isTSUnknownKeyword = isTSUnknownKeyword;
exports.isTSVoidKeyword = isTSVoidKeyword;
exports.isTaggedTemplateExpression = isTaggedTemplateExpression;
exports.isTemplateElement = isTemplateElement;
exports.isTemplateLiteral = isTemplateLiteral;
exports.isTerminatorless = isTerminatorless;
exports.isThisExpression = isThisExpression;
exports.isThisTypeAnnotation = isThisTypeAnnotation;
exports.isThrowStatement = isThrowStatement;
exports.isTopicReference = isTopicReference;
exports.isTryStatement = isTryStatement;
exports.isTupleExpression = isTupleExpression;
exports.isTupleTypeAnnotation = isTupleTypeAnnotation;
exports.isTypeAlias = isTypeAlias;
exports.isTypeAnnotation = isTypeAnnotation;
exports.isTypeCastExpression = isTypeCastExpression;
exports.isTypeParameter = isTypeParameter;
exports.isTypeParameterDeclaration = isTypeParameterDeclaration;
exports.isTypeParameterInstantiation = isTypeParameterInstantiation;
exports.isTypeScript = isTypeScript;
exports.isTypeofTypeAnnotation = isTypeofTypeAnnotation;
exports.isUnaryExpression = isUnaryExpression;
exports.isUnaryLike = isUnaryLike;
exports.isUnionTypeAnnotation = isUnionTypeAnnotation;
exports.isUpdateExpression = isUpdateExpression;
exports.isUserWhitespacable = isUserWhitespacable;
exports.isV8IntrinsicIdentifier = isV8IntrinsicIdentifier;
exports.isVariableDeclaration = isVariableDeclaration;
exports.isVariableDeclarator = isVariableDeclarator;
exports.isVariance = isVariance;
exports.isVoidTypeAnnotation = isVoidTypeAnnotation;
exports.isWhile = isWhile;
exports.isWhileStatement = isWhileStatement;
exports.isWithStatement = isWithStatement;
exports.isYieldExpression = isYieldExpression;
var _shallowEqual = require("../../utils/shallowEqual.js");
var _deprecationWarning = require("../../utils/deprecationWarning.js");
function isArrayExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "ArrayExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isAssignmentExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "AssignmentExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isBinaryExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "BinaryExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isInterpreterDirective(node, opts) {
  if (!node) return false;
  if (node.type !== "InterpreterDirective") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isDirective(node, opts) {
  if (!node) return false;
  if (node.type !== "Directive") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isDirectiveLiteral(node, opts) {
  if (!node) return false;
  if (node.type !== "DirectiveLiteral") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isBlockStatement(node, opts) {
  if (!node) return false;
  if (node.type !== "BlockStatement") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isBreakStatement(node, opts) {
  if (!node) return false;
  if (node.type !== "BreakStatement") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isCallExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "CallExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isCatchClause(node, opts) {
  if (!node) return false;
  if (node.type !== "CatchClause") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isConditionalExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "ConditionalExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isContinueStatement(node, opts) {
  if (!node) return false;
  if (node.type !== "ContinueStatement") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isDebuggerStatement(node, opts) {
  if (!node) return false;
  if (node.type !== "DebuggerStatement") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isDoWhileStatement(node, opts) {
  if (!node) return false;
  if (node.type !== "DoWhileStatement") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isEmptyStatement(node, opts) {
  if (!node) return false;
  if (node.type !== "EmptyStatement") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isExpressionStatement(node, opts) {
  if (!node) return false;
  if (node.type !== "ExpressionStatement") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isFile(node, opts) {
  if (!node) return false;
  if (node.type !== "File") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isForInStatement(node, opts) {
  if (!node) return false;
  if (node.type !== "ForInStatement") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isForStatement(node, opts) {
  if (!node) return false;
  if (node.type !== "ForStatement") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isFunctionDeclaration(node, opts) {
  if (!node) return false;
  if (node.type !== "FunctionDeclaration") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isFunctionExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "FunctionExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isIdentifier(node, opts) {
  if (!node) return false;
  if (node.type !== "Identifier") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isIfStatement(node, opts) {
  if (!node) return false;
  if (node.type !== "IfStatement") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isLabeledStatement(node, opts) {
  if (!node) return false;
  if (node.type !== "LabeledStatement") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isStringLiteral(node, opts) {
  if (!node) return false;
  if (node.type !== "StringLiteral") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isNumericLiteral(node, opts) {
  if (!node) return false;
  if (node.type !== "NumericLiteral") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isNullLiteral(node, opts) {
  if (!node) return false;
  if (node.type !== "NullLiteral") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isBooleanLiteral(node, opts) {
  if (!node) return false;
  if (node.type !== "BooleanLiteral") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isRegExpLiteral(node, opts) {
  if (!node) return false;
  if (node.type !== "RegExpLiteral") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isLogicalExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "LogicalExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isMemberExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "MemberExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isNewExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "NewExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isProgram(node, opts) {
  if (!node) return false;
  if (node.type !== "Program") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isObjectExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "ObjectExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isObjectMethod(node, opts) {
  if (!node) return false;
  if (node.type !== "ObjectMethod") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isObjectProperty(node, opts) {
  if (!node) return false;
  if (node.type !== "ObjectProperty") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isRestElement(node, opts) {
  if (!node) return false;
  if (node.type !== "RestElement") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isReturnStatement(node, opts) {
  if (!node) return false;
  if (node.type !== "ReturnStatement") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isSequenceExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "SequenceExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isParenthesizedExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "ParenthesizedExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isSwitchCase(node, opts) {
  if (!node) return false;
  if (node.type !== "SwitchCase") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isSwitchStatement(node, opts) {
  if (!node) return false;
  if (node.type !== "SwitchStatement") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isThisExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "ThisExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isThrowStatement(node, opts) {
  if (!node) return false;
  if (node.type !== "ThrowStatement") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTryStatement(node, opts) {
  if (!node) return false;
  if (node.type !== "TryStatement") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isUnaryExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "UnaryExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isUpdateExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "UpdateExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isVariableDeclaration(node, opts) {
  if (!node) return false;
  if (node.type !== "VariableDeclaration") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isVariableDeclarator(node, opts) {
  if (!node) return false;
  if (node.type !== "VariableDeclarator") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isWhileStatement(node, opts) {
  if (!node) return false;
  if (node.type !== "WhileStatement") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isWithStatement(node, opts) {
  if (!node) return false;
  if (node.type !== "WithStatement") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isAssignmentPattern(node, opts) {
  if (!node) return false;
  if (node.type !== "AssignmentPattern") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isArrayPattern(node, opts) {
  if (!node) return false;
  if (node.type !== "ArrayPattern") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isArrowFunctionExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "ArrowFunctionExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isClassBody(node, opts) {
  if (!node) return false;
  if (node.type !== "ClassBody") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isClassExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "ClassExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isClassDeclaration(node, opts) {
  if (!node) return false;
  if (node.type !== "ClassDeclaration") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isExportAllDeclaration(node, opts) {
  if (!node) return false;
  if (node.type !== "ExportAllDeclaration") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isExportDefaultDeclaration(node, opts) {
  if (!node) return false;
  if (node.type !== "ExportDefaultDeclaration") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isExportNamedDeclaration(node, opts) {
  if (!node) return false;
  if (node.type !== "ExportNamedDeclaration") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isExportSpecifier(node, opts) {
  if (!node) return false;
  if (node.type !== "ExportSpecifier") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isForOfStatement(node, opts) {
  if (!node) return false;
  if (node.type !== "ForOfStatement") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isImportDeclaration(node, opts) {
  if (!node) return false;
  if (node.type !== "ImportDeclaration") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isImportDefaultSpecifier(node, opts) {
  if (!node) return false;
  if (node.type !== "ImportDefaultSpecifier") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isImportNamespaceSpecifier(node, opts) {
  if (!node) return false;
  if (node.type !== "ImportNamespaceSpecifier") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isImportSpecifier(node, opts) {
  if (!node) return false;
  if (node.type !== "ImportSpecifier") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isImportExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "ImportExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isMetaProperty(node, opts) {
  if (!node) return false;
  if (node.type !== "MetaProperty") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isClassMethod(node, opts) {
  if (!node) return false;
  if (node.type !== "ClassMethod") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isObjectPattern(node, opts) {
  if (!node) return false;
  if (node.type !== "ObjectPattern") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isSpreadElement(node, opts) {
  if (!node) return false;
  if (node.type !== "SpreadElement") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isSuper(node, opts) {
  if (!node) return false;
  if (node.type !== "Super") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTaggedTemplateExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "TaggedTemplateExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTemplateElement(node, opts) {
  if (!node) return false;
  if (node.type !== "TemplateElement") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTemplateLiteral(node, opts) {
  if (!node) return false;
  if (node.type !== "TemplateLiteral") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isYieldExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "YieldExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isAwaitExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "AwaitExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isImport(node, opts) {
  if (!node) return false;
  if (node.type !== "Import") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isBigIntLiteral(node, opts) {
  if (!node) return false;
  if (node.type !== "BigIntLiteral") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isExportNamespaceSpecifier(node, opts) {
  if (!node) return false;
  if (node.type !== "ExportNamespaceSpecifier") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isOptionalMemberExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "OptionalMemberExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isOptionalCallExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "OptionalCallExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isClassProperty(node, opts) {
  if (!node) return false;
  if (node.type !== "ClassProperty") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isClassAccessorProperty(node, opts) {
  if (!node) return false;
  if (node.type !== "ClassAccessorProperty") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isClassPrivateProperty(node, opts) {
  if (!node) return false;
  if (node.type !== "ClassPrivateProperty") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isClassPrivateMethod(node, opts) {
  if (!node) return false;
  if (node.type !== "ClassPrivateMethod") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isPrivateName(node, opts) {
  if (!node) return false;
  if (node.type !== "PrivateName") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isStaticBlock(node, opts) {
  if (!node) return false;
  if (node.type !== "StaticBlock") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isAnyTypeAnnotation(node, opts) {
  if (!node) return false;
  if (node.type !== "AnyTypeAnnotation") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isArrayTypeAnnotation(node, opts) {
  if (!node) return false;
  if (node.type !== "ArrayTypeAnnotation") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isBooleanTypeAnnotation(node, opts) {
  if (!node) return false;
  if (node.type !== "BooleanTypeAnnotation") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isBooleanLiteralTypeAnnotation(node, opts) {
  if (!node) return false;
  if (node.type !== "BooleanLiteralTypeAnnotation") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isNullLiteralTypeAnnotation(node, opts) {
  if (!node) return false;
  if (node.type !== "NullLiteralTypeAnnotation") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isClassImplements(node, opts) {
  if (!node) return false;
  if (node.type !== "ClassImplements") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isDeclareClass(node, opts) {
  if (!node) return false;
  if (node.type !== "DeclareClass") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isDeclareFunction(node, opts) {
  if (!node) return false;
  if (node.type !== "DeclareFunction") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isDeclareInterface(node, opts) {
  if (!node) return false;
  if (node.type !== "DeclareInterface") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isDeclareModule(node, opts) {
  if (!node) return false;
  if (node.type !== "DeclareModule") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isDeclareModuleExports(node, opts) {
  if (!node) return false;
  if (node.type !== "DeclareModuleExports") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isDeclareTypeAlias(node, opts) {
  if (!node) return false;
  if (node.type !== "DeclareTypeAlias") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isDeclareOpaqueType(node, opts) {
  if (!node) return false;
  if (node.type !== "DeclareOpaqueType") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isDeclareVariable(node, opts) {
  if (!node) return false;
  if (node.type !== "DeclareVariable") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isDeclareExportDeclaration(node, opts) {
  if (!node) return false;
  if (node.type !== "DeclareExportDeclaration") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isDeclareExportAllDeclaration(node, opts) {
  if (!node) return false;
  if (node.type !== "DeclareExportAllDeclaration") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isDeclaredPredicate(node, opts) {
  if (!node) return false;
  if (node.type !== "DeclaredPredicate") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isExistsTypeAnnotation(node, opts) {
  if (!node) return false;
  if (node.type !== "ExistsTypeAnnotation") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isFunctionTypeAnnotation(node, opts) {
  if (!node) return false;
  if (node.type !== "FunctionTypeAnnotation") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isFunctionTypeParam(node, opts) {
  if (!node) return false;
  if (node.type !== "FunctionTypeParam") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isGenericTypeAnnotation(node, opts) {
  if (!node) return false;
  if (node.type !== "GenericTypeAnnotation") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isInferredPredicate(node, opts) {
  if (!node) return false;
  if (node.type !== "InferredPredicate") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isInterfaceExtends(node, opts) {
  if (!node) return false;
  if (node.type !== "InterfaceExtends") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isInterfaceDeclaration(node, opts) {
  if (!node) return false;
  if (node.type !== "InterfaceDeclaration") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isInterfaceTypeAnnotation(node, opts) {
  if (!node) return false;
  if (node.type !== "InterfaceTypeAnnotation") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isIntersectionTypeAnnotation(node, opts) {
  if (!node) return false;
  if (node.type !== "IntersectionTypeAnnotation") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isMixedTypeAnnotation(node, opts) {
  if (!node) return false;
  if (node.type !== "MixedTypeAnnotation") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isEmptyTypeAnnotation(node, opts) {
  if (!node) return false;
  if (node.type !== "EmptyTypeAnnotation") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isNullableTypeAnnotation(node, opts) {
  if (!node) return false;
  if (node.type !== "NullableTypeAnnotation") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isNumberLiteralTypeAnnotation(node, opts) {
  if (!node) return false;
  if (node.type !== "NumberLiteralTypeAnnotation") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isNumberTypeAnnotation(node, opts) {
  if (!node) return false;
  if (node.type !== "NumberTypeAnnotation") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isObjectTypeAnnotation(node, opts) {
  if (!node) return false;
  if (node.type !== "ObjectTypeAnnotation") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isObjectTypeInternalSlot(node, opts) {
  if (!node) return false;
  if (node.type !== "ObjectTypeInternalSlot") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isObjectTypeCallProperty(node, opts) {
  if (!node) return false;
  if (node.type !== "ObjectTypeCallProperty") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isObjectTypeIndexer(node, opts) {
  if (!node) return false;
  if (node.type !== "ObjectTypeIndexer") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isObjectTypeProperty(node, opts) {
  if (!node) return false;
  if (node.type !== "ObjectTypeProperty") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isObjectTypeSpreadProperty(node, opts) {
  if (!node) return false;
  if (node.type !== "ObjectTypeSpreadProperty") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isOpaqueType(node, opts) {
  if (!node) return false;
  if (node.type !== "OpaqueType") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isQualifiedTypeIdentifier(node, opts) {
  if (!node) return false;
  if (node.type !== "QualifiedTypeIdentifier") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isStringLiteralTypeAnnotation(node, opts) {
  if (!node) return false;
  if (node.type !== "StringLiteralTypeAnnotation") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isStringTypeAnnotation(node, opts) {
  if (!node) return false;
  if (node.type !== "StringTypeAnnotation") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isSymbolTypeAnnotation(node, opts) {
  if (!node) return false;
  if (node.type !== "SymbolTypeAnnotation") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isThisTypeAnnotation(node, opts) {
  if (!node) return false;
  if (node.type !== "ThisTypeAnnotation") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTupleTypeAnnotation(node, opts) {
  if (!node) return false;
  if (node.type !== "TupleTypeAnnotation") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTypeofTypeAnnotation(node, opts) {
  if (!node) return false;
  if (node.type !== "TypeofTypeAnnotation") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTypeAlias(node, opts) {
  if (!node) return false;
  if (node.type !== "TypeAlias") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTypeAnnotation(node, opts) {
  if (!node) return false;
  if (node.type !== "TypeAnnotation") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTypeCastExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "TypeCastExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTypeParameter(node, opts) {
  if (!node) return false;
  if (node.type !== "TypeParameter") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTypeParameterDeclaration(node, opts) {
  if (!node) return false;
  if (node.type !== "TypeParameterDeclaration") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTypeParameterInstantiation(node, opts) {
  if (!node) return false;
  if (node.type !== "TypeParameterInstantiation") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isUnionTypeAnnotation(node, opts) {
  if (!node) return false;
  if (node.type !== "UnionTypeAnnotation") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isVariance(node, opts) {
  if (!node) return false;
  if (node.type !== "Variance") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isVoidTypeAnnotation(node, opts) {
  if (!node) return false;
  if (node.type !== "VoidTypeAnnotation") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isEnumDeclaration(node, opts) {
  if (!node) return false;
  if (node.type !== "EnumDeclaration") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isEnumBooleanBody(node, opts) {
  if (!node) return false;
  if (node.type !== "EnumBooleanBody") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isEnumNumberBody(node, opts) {
  if (!node) return false;
  if (node.type !== "EnumNumberBody") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isEnumStringBody(node, opts) {
  if (!node) return false;
  if (node.type !== "EnumStringBody") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isEnumSymbolBody(node, opts) {
  if (!node) return false;
  if (node.type !== "EnumSymbolBody") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isEnumBooleanMember(node, opts) {
  if (!node) return false;
  if (node.type !== "EnumBooleanMember") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isEnumNumberMember(node, opts) {
  if (!node) return false;
  if (node.type !== "EnumNumberMember") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isEnumStringMember(node, opts) {
  if (!node) return false;
  if (node.type !== "EnumStringMember") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isEnumDefaultedMember(node, opts) {
  if (!node) return false;
  if (node.type !== "EnumDefaultedMember") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isIndexedAccessType(node, opts) {
  if (!node) return false;
  if (node.type !== "IndexedAccessType") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isOptionalIndexedAccessType(node, opts) {
  if (!node) return false;
  if (node.type !== "OptionalIndexedAccessType") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isJSXAttribute(node, opts) {
  if (!node) return false;
  if (node.type !== "JSXAttribute") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isJSXClosingElement(node, opts) {
  if (!node) return false;
  if (node.type !== "JSXClosingElement") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isJSXElement(node, opts) {
  if (!node) return false;
  if (node.type !== "JSXElement") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isJSXEmptyExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "JSXEmptyExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isJSXExpressionContainer(node, opts) {
  if (!node) return false;
  if (node.type !== "JSXExpressionContainer") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isJSXSpreadChild(node, opts) {
  if (!node) return false;
  if (node.type !== "JSXSpreadChild") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isJSXIdentifier(node, opts) {
  if (!node) return false;
  if (node.type !== "JSXIdentifier") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isJSXMemberExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "JSXMemberExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isJSXNamespacedName(node, opts) {
  if (!node) return false;
  if (node.type !== "JSXNamespacedName") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isJSXOpeningElement(node, opts) {
  if (!node) return false;
  if (node.type !== "JSXOpeningElement") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isJSXSpreadAttribute(node, opts) {
  if (!node) return false;
  if (node.type !== "JSXSpreadAttribute") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isJSXText(node, opts) {
  if (!node) return false;
  if (node.type !== "JSXText") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isJSXFragment(node, opts) {
  if (!node) return false;
  if (node.type !== "JSXFragment") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isJSXOpeningFragment(node, opts) {
  if (!node) return false;
  if (node.type !== "JSXOpeningFragment") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isJSXClosingFragment(node, opts) {
  if (!node) return false;
  if (node.type !== "JSXClosingFragment") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isNoop(node, opts) {
  if (!node) return false;
  if (node.type !== "Noop") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isPlaceholder(node, opts) {
  if (!node) return false;
  if (node.type !== "Placeholder") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isV8IntrinsicIdentifier(node, opts) {
  if (!node) return false;
  if (node.type !== "V8IntrinsicIdentifier") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isArgumentPlaceholder(node, opts) {
  if (!node) return false;
  if (node.type !== "ArgumentPlaceholder") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isBindExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "BindExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isImportAttribute(node, opts) {
  if (!node) return false;
  if (node.type !== "ImportAttribute") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isDecorator(node, opts) {
  if (!node) return false;
  if (node.type !== "Decorator") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isDoExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "DoExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isExportDefaultSpecifier(node, opts) {
  if (!node) return false;
  if (node.type !== "ExportDefaultSpecifier") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isRecordExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "RecordExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTupleExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "TupleExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isDecimalLiteral(node, opts) {
  if (!node) return false;
  if (node.type !== "DecimalLiteral") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isModuleExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "ModuleExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTopicReference(node, opts) {
  if (!node) return false;
  if (node.type !== "TopicReference") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isPipelineTopicExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "PipelineTopicExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isPipelineBareFunction(node, opts) {
  if (!node) return false;
  if (node.type !== "PipelineBareFunction") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isPipelinePrimaryTopicReference(node, opts) {
  if (!node) return false;
  if (node.type !== "PipelinePrimaryTopicReference") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSParameterProperty(node, opts) {
  if (!node) return false;
  if (node.type !== "TSParameterProperty") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSDeclareFunction(node, opts) {
  if (!node) return false;
  if (node.type !== "TSDeclareFunction") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSDeclareMethod(node, opts) {
  if (!node) return false;
  if (node.type !== "TSDeclareMethod") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSQualifiedName(node, opts) {
  if (!node) return false;
  if (node.type !== "TSQualifiedName") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSCallSignatureDeclaration(node, opts) {
  if (!node) return false;
  if (node.type !== "TSCallSignatureDeclaration") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSConstructSignatureDeclaration(node, opts) {
  if (!node) return false;
  if (node.type !== "TSConstructSignatureDeclaration") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSPropertySignature(node, opts) {
  if (!node) return false;
  if (node.type !== "TSPropertySignature") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSMethodSignature(node, opts) {
  if (!node) return false;
  if (node.type !== "TSMethodSignature") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSIndexSignature(node, opts) {
  if (!node) return false;
  if (node.type !== "TSIndexSignature") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSAnyKeyword(node, opts) {
  if (!node) return false;
  if (node.type !== "TSAnyKeyword") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSBooleanKeyword(node, opts) {
  if (!node) return false;
  if (node.type !== "TSBooleanKeyword") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSBigIntKeyword(node, opts) {
  if (!node) return false;
  if (node.type !== "TSBigIntKeyword") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSIntrinsicKeyword(node, opts) {
  if (!node) return false;
  if (node.type !== "TSIntrinsicKeyword") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSNeverKeyword(node, opts) {
  if (!node) return false;
  if (node.type !== "TSNeverKeyword") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSNullKeyword(node, opts) {
  if (!node) return false;
  if (node.type !== "TSNullKeyword") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSNumberKeyword(node, opts) {
  if (!node) return false;
  if (node.type !== "TSNumberKeyword") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSObjectKeyword(node, opts) {
  if (!node) return false;
  if (node.type !== "TSObjectKeyword") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSStringKeyword(node, opts) {
  if (!node) return false;
  if (node.type !== "TSStringKeyword") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSSymbolKeyword(node, opts) {
  if (!node) return false;
  if (node.type !== "TSSymbolKeyword") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSUndefinedKeyword(node, opts) {
  if (!node) return false;
  if (node.type !== "TSUndefinedKeyword") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSUnknownKeyword(node, opts) {
  if (!node) return false;
  if (node.type !== "TSUnknownKeyword") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSVoidKeyword(node, opts) {
  if (!node) return false;
  if (node.type !== "TSVoidKeyword") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSThisType(node, opts) {
  if (!node) return false;
  if (node.type !== "TSThisType") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSFunctionType(node, opts) {
  if (!node) return false;
  if (node.type !== "TSFunctionType") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSConstructorType(node, opts) {
  if (!node) return false;
  if (node.type !== "TSConstructorType") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSTypeReference(node, opts) {
  if (!node) return false;
  if (node.type !== "TSTypeReference") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSTypePredicate(node, opts) {
  if (!node) return false;
  if (node.type !== "TSTypePredicate") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSTypeQuery(node, opts) {
  if (!node) return false;
  if (node.type !== "TSTypeQuery") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSTypeLiteral(node, opts) {
  if (!node) return false;
  if (node.type !== "TSTypeLiteral") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSArrayType(node, opts) {
  if (!node) return false;
  if (node.type !== "TSArrayType") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSTupleType(node, opts) {
  if (!node) return false;
  if (node.type !== "TSTupleType") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSOptionalType(node, opts) {
  if (!node) return false;
  if (node.type !== "TSOptionalType") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSRestType(node, opts) {
  if (!node) return false;
  if (node.type !== "TSRestType") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSNamedTupleMember(node, opts) {
  if (!node) return false;
  if (node.type !== "TSNamedTupleMember") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSUnionType(node, opts) {
  if (!node) return false;
  if (node.type !== "TSUnionType") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSIntersectionType(node, opts) {
  if (!node) return false;
  if (node.type !== "TSIntersectionType") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSConditionalType(node, opts) {
  if (!node) return false;
  if (node.type !== "TSConditionalType") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSInferType(node, opts) {
  if (!node) return false;
  if (node.type !== "TSInferType") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSParenthesizedType(node, opts) {
  if (!node) return false;
  if (node.type !== "TSParenthesizedType") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSTypeOperator(node, opts) {
  if (!node) return false;
  if (node.type !== "TSTypeOperator") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSIndexedAccessType(node, opts) {
  if (!node) return false;
  if (node.type !== "TSIndexedAccessType") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSMappedType(node, opts) {
  if (!node) return false;
  if (node.type !== "TSMappedType") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSLiteralType(node, opts) {
  if (!node) return false;
  if (node.type !== "TSLiteralType") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSExpressionWithTypeArguments(node, opts) {
  if (!node) return false;
  if (node.type !== "TSExpressionWithTypeArguments") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSInterfaceDeclaration(node, opts) {
  if (!node) return false;
  if (node.type !== "TSInterfaceDeclaration") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSInterfaceBody(node, opts) {
  if (!node) return false;
  if (node.type !== "TSInterfaceBody") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSTypeAliasDeclaration(node, opts) {
  if (!node) return false;
  if (node.type !== "TSTypeAliasDeclaration") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSInstantiationExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "TSInstantiationExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSAsExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "TSAsExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSSatisfiesExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "TSSatisfiesExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSTypeAssertion(node, opts) {
  if (!node) return false;
  if (node.type !== "TSTypeAssertion") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSEnumDeclaration(node, opts) {
  if (!node) return false;
  if (node.type !== "TSEnumDeclaration") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSEnumMember(node, opts) {
  if (!node) return false;
  if (node.type !== "TSEnumMember") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSModuleDeclaration(node, opts) {
  if (!node) return false;
  if (node.type !== "TSModuleDeclaration") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSModuleBlock(node, opts) {
  if (!node) return false;
  if (node.type !== "TSModuleBlock") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSImportType(node, opts) {
  if (!node) return false;
  if (node.type !== "TSImportType") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSImportEqualsDeclaration(node, opts) {
  if (!node) return false;
  if (node.type !== "TSImportEqualsDeclaration") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSExternalModuleReference(node, opts) {
  if (!node) return false;
  if (node.type !== "TSExternalModuleReference") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSNonNullExpression(node, opts) {
  if (!node) return false;
  if (node.type !== "TSNonNullExpression") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSExportAssignment(node, opts) {
  if (!node) return false;
  if (node.type !== "TSExportAssignment") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSNamespaceExportDeclaration(node, opts) {
  if (!node) return false;
  if (node.type !== "TSNamespaceExportDeclaration") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSTypeAnnotation(node, opts) {
  if (!node) return false;
  if (node.type !== "TSTypeAnnotation") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSTypeParameterInstantiation(node, opts) {
  if (!node) return false;
  if (node.type !== "TSTypeParameterInstantiation") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSTypeParameterDeclaration(node, opts) {
  if (!node) return false;
  if (node.type !== "TSTypeParameterDeclaration") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSTypeParameter(node, opts) {
  if (!node) return false;
  if (node.type !== "TSTypeParameter") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isStandardized(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "ArrayExpression":
    case "AssignmentExpression":
    case "BinaryExpression":
    case "InterpreterDirective":
    case "Directive":
    case "DirectiveLiteral":
    case "BlockStatement":
    case "BreakStatement":
    case "CallExpression":
    case "CatchClause":
    case "ConditionalExpression":
    case "ContinueStatement":
    case "DebuggerStatement":
    case "DoWhileStatement":
    case "EmptyStatement":
    case "ExpressionStatement":
    case "File":
    case "ForInStatement":
    case "ForStatement":
    case "FunctionDeclaration":
    case "FunctionExpression":
    case "Identifier":
    case "IfStatement":
    case "LabeledStatement":
    case "StringLiteral":
    case "NumericLiteral":
    case "NullLiteral":
    case "BooleanLiteral":
    case "RegExpLiteral":
    case "LogicalExpression":
    case "MemberExpression":
    case "NewExpression":
    case "Program":
    case "ObjectExpression":
    case "ObjectMethod":
    case "ObjectProperty":
    case "RestElement":
    case "ReturnStatement":
    case "SequenceExpression":
    case "ParenthesizedExpression":
    case "SwitchCase":
    case "SwitchStatement":
    case "ThisExpression":
    case "ThrowStatement":
    case "TryStatement":
    case "UnaryExpression":
    case "UpdateExpression":
    case "VariableDeclaration":
    case "VariableDeclarator":
    case "WhileStatement":
    case "WithStatement":
    case "AssignmentPattern":
    case "ArrayPattern":
    case "ArrowFunctionExpression":
    case "ClassBody":
    case "ClassExpression":
    case "ClassDeclaration":
    case "ExportAllDeclaration":
    case "ExportDefaultDeclaration":
    case "ExportNamedDeclaration":
    case "ExportSpecifier":
    case "ForOfStatement":
    case "ImportDeclaration":
    case "ImportDefaultSpecifier":
    case "ImportNamespaceSpecifier":
    case "ImportSpecifier":
    case "ImportExpression":
    case "MetaProperty":
    case "ClassMethod":
    case "ObjectPattern":
    case "SpreadElement":
    case "Super":
    case "TaggedTemplateExpression":
    case "TemplateElement":
    case "TemplateLiteral":
    case "YieldExpression":
    case "AwaitExpression":
    case "Import":
    case "BigIntLiteral":
    case "ExportNamespaceSpecifier":
    case "OptionalMemberExpression":
    case "OptionalCallExpression":
    case "ClassProperty":
    case "ClassAccessorProperty":
    case "ClassPrivateProperty":
    case "ClassPrivateMethod":
    case "PrivateName":
    case "StaticBlock":
      break;
    case "Placeholder":
      switch (node.expectedNode) {
        case "Identifier":
        case "StringLiteral":
        case "BlockStatement":
        case "ClassBody":
          break;
        default:
          return false;
      }
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isExpression(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "ArrayExpression":
    case "AssignmentExpression":
    case "BinaryExpression":
    case "CallExpression":
    case "ConditionalExpression":
    case "FunctionExpression":
    case "Identifier":
    case "StringLiteral":
    case "NumericLiteral":
    case "NullLiteral":
    case "BooleanLiteral":
    case "RegExpLiteral":
    case "LogicalExpression":
    case "MemberExpression":
    case "NewExpression":
    case "ObjectExpression":
    case "SequenceExpression":
    case "ParenthesizedExpression":
    case "ThisExpression":
    case "UnaryExpression":
    case "UpdateExpression":
    case "ArrowFunctionExpression":
    case "ClassExpression":
    case "ImportExpression":
    case "MetaProperty":
    case "Super":
    case "TaggedTemplateExpression":
    case "TemplateLiteral":
    case "YieldExpression":
    case "AwaitExpression":
    case "Import":
    case "BigIntLiteral":
    case "OptionalMemberExpression":
    case "OptionalCallExpression":
    case "TypeCastExpression":
    case "JSXElement":
    case "JSXFragment":
    case "BindExpression":
    case "DoExpression":
    case "RecordExpression":
    case "TupleExpression":
    case "DecimalLiteral":
    case "ModuleExpression":
    case "TopicReference":
    case "PipelineTopicExpression":
    case "PipelineBareFunction":
    case "PipelinePrimaryTopicReference":
    case "TSInstantiationExpression":
    case "TSAsExpression":
    case "TSSatisfiesExpression":
    case "TSTypeAssertion":
    case "TSNonNullExpression":
      break;
    case "Placeholder":
      switch (node.expectedNode) {
        case "Expression":
        case "Identifier":
        case "StringLiteral":
          break;
        default:
          return false;
      }
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isBinary(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "BinaryExpression":
    case "LogicalExpression":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isScopable(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "BlockStatement":
    case "CatchClause":
    case "DoWhileStatement":
    case "ForInStatement":
    case "ForStatement":
    case "FunctionDeclaration":
    case "FunctionExpression":
    case "Program":
    case "ObjectMethod":
    case "SwitchStatement":
    case "WhileStatement":
    case "ArrowFunctionExpression":
    case "ClassExpression":
    case "ClassDeclaration":
    case "ForOfStatement":
    case "ClassMethod":
    case "ClassPrivateMethod":
    case "StaticBlock":
    case "TSModuleBlock":
      break;
    case "Placeholder":
      if (node.expectedNode === "BlockStatement") break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isBlockParent(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "BlockStatement":
    case "CatchClause":
    case "DoWhileStatement":
    case "ForInStatement":
    case "ForStatement":
    case "FunctionDeclaration":
    case "FunctionExpression":
    case "Program":
    case "ObjectMethod":
    case "SwitchStatement":
    case "WhileStatement":
    case "ArrowFunctionExpression":
    case "ForOfStatement":
    case "ClassMethod":
    case "ClassPrivateMethod":
    case "StaticBlock":
    case "TSModuleBlock":
      break;
    case "Placeholder":
      if (node.expectedNode === "BlockStatement") break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isBlock(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "BlockStatement":
    case "Program":
    case "TSModuleBlock":
      break;
    case "Placeholder":
      if (node.expectedNode === "BlockStatement") break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isStatement(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "BlockStatement":
    case "BreakStatement":
    case "ContinueStatement":
    case "DebuggerStatement":
    case "DoWhileStatement":
    case "EmptyStatement":
    case "ExpressionStatement":
    case "ForInStatement":
    case "ForStatement":
    case "FunctionDeclaration":
    case "IfStatement":
    case "LabeledStatement":
    case "ReturnStatement":
    case "SwitchStatement":
    case "ThrowStatement":
    case "TryStatement":
    case "VariableDeclaration":
    case "WhileStatement":
    case "WithStatement":
    case "ClassDeclaration":
    case "ExportAllDeclaration":
    case "ExportDefaultDeclaration":
    case "ExportNamedDeclaration":
    case "ForOfStatement":
    case "ImportDeclaration":
    case "DeclareClass":
    case "DeclareFunction":
    case "DeclareInterface":
    case "DeclareModule":
    case "DeclareModuleExports":
    case "DeclareTypeAlias":
    case "DeclareOpaqueType":
    case "DeclareVariable":
    case "DeclareExportDeclaration":
    case "DeclareExportAllDeclaration":
    case "InterfaceDeclaration":
    case "OpaqueType":
    case "TypeAlias":
    case "EnumDeclaration":
    case "TSDeclareFunction":
    case "TSInterfaceDeclaration":
    case "TSTypeAliasDeclaration":
    case "TSEnumDeclaration":
    case "TSModuleDeclaration":
    case "TSImportEqualsDeclaration":
    case "TSExportAssignment":
    case "TSNamespaceExportDeclaration":
      break;
    case "Placeholder":
      switch (node.expectedNode) {
        case "Statement":
        case "Declaration":
        case "BlockStatement":
          break;
        default:
          return false;
      }
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTerminatorless(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "BreakStatement":
    case "ContinueStatement":
    case "ReturnStatement":
    case "ThrowStatement":
    case "YieldExpression":
    case "AwaitExpression":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isCompletionStatement(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "BreakStatement":
    case "ContinueStatement":
    case "ReturnStatement":
    case "ThrowStatement":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isConditional(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "ConditionalExpression":
    case "IfStatement":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isLoop(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "DoWhileStatement":
    case "ForInStatement":
    case "ForStatement":
    case "WhileStatement":
    case "ForOfStatement":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isWhile(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "DoWhileStatement":
    case "WhileStatement":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isExpressionWrapper(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "ExpressionStatement":
    case "ParenthesizedExpression":
    case "TypeCastExpression":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isFor(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "ForInStatement":
    case "ForStatement":
    case "ForOfStatement":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isForXStatement(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "ForInStatement":
    case "ForOfStatement":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isFunction(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "FunctionDeclaration":
    case "FunctionExpression":
    case "ObjectMethod":
    case "ArrowFunctionExpression":
    case "ClassMethod":
    case "ClassPrivateMethod":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isFunctionParent(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "FunctionDeclaration":
    case "FunctionExpression":
    case "ObjectMethod":
    case "ArrowFunctionExpression":
    case "ClassMethod":
    case "ClassPrivateMethod":
    case "StaticBlock":
    case "TSModuleBlock":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isPureish(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "FunctionDeclaration":
    case "FunctionExpression":
    case "StringLiteral":
    case "NumericLiteral":
    case "NullLiteral":
    case "BooleanLiteral":
    case "RegExpLiteral":
    case "ArrowFunctionExpression":
    case "BigIntLiteral":
    case "DecimalLiteral":
      break;
    case "Placeholder":
      if (node.expectedNode === "StringLiteral") break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isDeclaration(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "FunctionDeclaration":
    case "VariableDeclaration":
    case "ClassDeclaration":
    case "ExportAllDeclaration":
    case "ExportDefaultDeclaration":
    case "ExportNamedDeclaration":
    case "ImportDeclaration":
    case "DeclareClass":
    case "DeclareFunction":
    case "DeclareInterface":
    case "DeclareModule":
    case "DeclareModuleExports":
    case "DeclareTypeAlias":
    case "DeclareOpaqueType":
    case "DeclareVariable":
    case "DeclareExportDeclaration":
    case "DeclareExportAllDeclaration":
    case "InterfaceDeclaration":
    case "OpaqueType":
    case "TypeAlias":
    case "EnumDeclaration":
    case "TSDeclareFunction":
    case "TSInterfaceDeclaration":
    case "TSTypeAliasDeclaration":
    case "TSEnumDeclaration":
    case "TSModuleDeclaration":
      break;
    case "Placeholder":
      if (node.expectedNode === "Declaration") break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isPatternLike(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "Identifier":
    case "RestElement":
    case "AssignmentPattern":
    case "ArrayPattern":
    case "ObjectPattern":
    case "TSAsExpression":
    case "TSSatisfiesExpression":
    case "TSTypeAssertion":
    case "TSNonNullExpression":
      break;
    case "Placeholder":
      switch (node.expectedNode) {
        case "Pattern":
        case "Identifier":
          break;
        default:
          return false;
      }
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isLVal(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "Identifier":
    case "MemberExpression":
    case "RestElement":
    case "AssignmentPattern":
    case "ArrayPattern":
    case "ObjectPattern":
    case "TSParameterProperty":
    case "TSAsExpression":
    case "TSSatisfiesExpression":
    case "TSTypeAssertion":
    case "TSNonNullExpression":
      break;
    case "Placeholder":
      switch (node.expectedNode) {
        case "Pattern":
        case "Identifier":
          break;
        default:
          return false;
      }
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSEntityName(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "Identifier":
    case "TSQualifiedName":
      break;
    case "Placeholder":
      if (node.expectedNode === "Identifier") break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isLiteral(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "StringLiteral":
    case "NumericLiteral":
    case "NullLiteral":
    case "BooleanLiteral":
    case "RegExpLiteral":
    case "TemplateLiteral":
    case "BigIntLiteral":
    case "DecimalLiteral":
      break;
    case "Placeholder":
      if (node.expectedNode === "StringLiteral") break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isImmutable(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "StringLiteral":
    case "NumericLiteral":
    case "NullLiteral":
    case "BooleanLiteral":
    case "BigIntLiteral":
    case "JSXAttribute":
    case "JSXClosingElement":
    case "JSXElement":
    case "JSXExpressionContainer":
    case "JSXSpreadChild":
    case "JSXOpeningElement":
    case "JSXText":
    case "JSXFragment":
    case "JSXOpeningFragment":
    case "JSXClosingFragment":
    case "DecimalLiteral":
      break;
    case "Placeholder":
      if (node.expectedNode === "StringLiteral") break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isUserWhitespacable(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "ObjectMethod":
    case "ObjectProperty":
    case "ObjectTypeInternalSlot":
    case "ObjectTypeCallProperty":
    case "ObjectTypeIndexer":
    case "ObjectTypeProperty":
    case "ObjectTypeSpreadProperty":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isMethod(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "ObjectMethod":
    case "ClassMethod":
    case "ClassPrivateMethod":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isObjectMember(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "ObjectMethod":
    case "ObjectProperty":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isProperty(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "ObjectProperty":
    case "ClassProperty":
    case "ClassAccessorProperty":
    case "ClassPrivateProperty":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isUnaryLike(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "UnaryExpression":
    case "SpreadElement":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isPattern(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "AssignmentPattern":
    case "ArrayPattern":
    case "ObjectPattern":
      break;
    case "Placeholder":
      if (node.expectedNode === "Pattern") break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isClass(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "ClassExpression":
    case "ClassDeclaration":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isImportOrExportDeclaration(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "ExportAllDeclaration":
    case "ExportDefaultDeclaration":
    case "ExportNamedDeclaration":
    case "ImportDeclaration":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isExportDeclaration(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "ExportAllDeclaration":
    case "ExportDefaultDeclaration":
    case "ExportNamedDeclaration":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isModuleSpecifier(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "ExportSpecifier":
    case "ImportDefaultSpecifier":
    case "ImportNamespaceSpecifier":
    case "ImportSpecifier":
    case "ExportNamespaceSpecifier":
    case "ExportDefaultSpecifier":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isAccessor(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "ClassAccessorProperty":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isPrivate(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "ClassPrivateProperty":
    case "ClassPrivateMethod":
    case "PrivateName":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isFlow(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "AnyTypeAnnotation":
    case "ArrayTypeAnnotation":
    case "BooleanTypeAnnotation":
    case "BooleanLiteralTypeAnnotation":
    case "NullLiteralTypeAnnotation":
    case "ClassImplements":
    case "DeclareClass":
    case "DeclareFunction":
    case "DeclareInterface":
    case "DeclareModule":
    case "DeclareModuleExports":
    case "DeclareTypeAlias":
    case "DeclareOpaqueType":
    case "DeclareVariable":
    case "DeclareExportDeclaration":
    case "DeclareExportAllDeclaration":
    case "DeclaredPredicate":
    case "ExistsTypeAnnotation":
    case "FunctionTypeAnnotation":
    case "FunctionTypeParam":
    case "GenericTypeAnnotation":
    case "InferredPredicate":
    case "InterfaceExtends":
    case "InterfaceDeclaration":
    case "InterfaceTypeAnnotation":
    case "IntersectionTypeAnnotation":
    case "MixedTypeAnnotation":
    case "EmptyTypeAnnotation":
    case "NullableTypeAnnotation":
    case "NumberLiteralTypeAnnotation":
    case "NumberTypeAnnotation":
    case "ObjectTypeAnnotation":
    case "ObjectTypeInternalSlot":
    case "ObjectTypeCallProperty":
    case "ObjectTypeIndexer":
    case "ObjectTypeProperty":
    case "ObjectTypeSpreadProperty":
    case "OpaqueType":
    case "QualifiedTypeIdentifier":
    case "StringLiteralTypeAnnotation":
    case "StringTypeAnnotation":
    case "SymbolTypeAnnotation":
    case "ThisTypeAnnotation":
    case "TupleTypeAnnotation":
    case "TypeofTypeAnnotation":
    case "TypeAlias":
    case "TypeAnnotation":
    case "TypeCastExpression":
    case "TypeParameter":
    case "TypeParameterDeclaration":
    case "TypeParameterInstantiation":
    case "UnionTypeAnnotation":
    case "Variance":
    case "VoidTypeAnnotation":
    case "EnumDeclaration":
    case "EnumBooleanBody":
    case "EnumNumberBody":
    case "EnumStringBody":
    case "EnumSymbolBody":
    case "EnumBooleanMember":
    case "EnumNumberMember":
    case "EnumStringMember":
    case "EnumDefaultedMember":
    case "IndexedAccessType":
    case "OptionalIndexedAccessType":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isFlowType(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "AnyTypeAnnotation":
    case "ArrayTypeAnnotation":
    case "BooleanTypeAnnotation":
    case "BooleanLiteralTypeAnnotation":
    case "NullLiteralTypeAnnotation":
    case "ExistsTypeAnnotation":
    case "FunctionTypeAnnotation":
    case "GenericTypeAnnotation":
    case "InterfaceTypeAnnotation":
    case "IntersectionTypeAnnotation":
    case "MixedTypeAnnotation":
    case "EmptyTypeAnnotation":
    case "NullableTypeAnnotation":
    case "NumberLiteralTypeAnnotation":
    case "NumberTypeAnnotation":
    case "ObjectTypeAnnotation":
    case "StringLiteralTypeAnnotation":
    case "StringTypeAnnotation":
    case "SymbolTypeAnnotation":
    case "ThisTypeAnnotation":
    case "TupleTypeAnnotation":
    case "TypeofTypeAnnotation":
    case "UnionTypeAnnotation":
    case "VoidTypeAnnotation":
    case "IndexedAccessType":
    case "OptionalIndexedAccessType":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isFlowBaseAnnotation(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "AnyTypeAnnotation":
    case "BooleanTypeAnnotation":
    case "NullLiteralTypeAnnotation":
    case "MixedTypeAnnotation":
    case "EmptyTypeAnnotation":
    case "NumberTypeAnnotation":
    case "StringTypeAnnotation":
    case "SymbolTypeAnnotation":
    case "ThisTypeAnnotation":
    case "VoidTypeAnnotation":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isFlowDeclaration(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "DeclareClass":
    case "DeclareFunction":
    case "DeclareInterface":
    case "DeclareModule":
    case "DeclareModuleExports":
    case "DeclareTypeAlias":
    case "DeclareOpaqueType":
    case "DeclareVariable":
    case "DeclareExportDeclaration":
    case "DeclareExportAllDeclaration":
    case "InterfaceDeclaration":
    case "OpaqueType":
    case "TypeAlias":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isFlowPredicate(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "DeclaredPredicate":
    case "InferredPredicate":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isEnumBody(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "EnumBooleanBody":
    case "EnumNumberBody":
    case "EnumStringBody":
    case "EnumSymbolBody":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isEnumMember(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "EnumBooleanMember":
    case "EnumNumberMember":
    case "EnumStringMember":
    case "EnumDefaultedMember":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isJSX(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "JSXAttribute":
    case "JSXClosingElement":
    case "JSXElement":
    case "JSXEmptyExpression":
    case "JSXExpressionContainer":
    case "JSXSpreadChild":
    case "JSXIdentifier":
    case "JSXMemberExpression":
    case "JSXNamespacedName":
    case "JSXOpeningElement":
    case "JSXSpreadAttribute":
    case "JSXText":
    case "JSXFragment":
    case "JSXOpeningFragment":
    case "JSXClosingFragment":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isMiscellaneous(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "Noop":
    case "Placeholder":
    case "V8IntrinsicIdentifier":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTypeScript(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "TSParameterProperty":
    case "TSDeclareFunction":
    case "TSDeclareMethod":
    case "TSQualifiedName":
    case "TSCallSignatureDeclaration":
    case "TSConstructSignatureDeclaration":
    case "TSPropertySignature":
    case "TSMethodSignature":
    case "TSIndexSignature":
    case "TSAnyKeyword":
    case "TSBooleanKeyword":
    case "TSBigIntKeyword":
    case "TSIntrinsicKeyword":
    case "TSNeverKeyword":
    case "TSNullKeyword":
    case "TSNumberKeyword":
    case "TSObjectKeyword":
    case "TSStringKeyword":
    case "TSSymbolKeyword":
    case "TSUndefinedKeyword":
    case "TSUnknownKeyword":
    case "TSVoidKeyword":
    case "TSThisType":
    case "TSFunctionType":
    case "TSConstructorType":
    case "TSTypeReference":
    case "TSTypePredicate":
    case "TSTypeQuery":
    case "TSTypeLiteral":
    case "TSArrayType":
    case "TSTupleType":
    case "TSOptionalType":
    case "TSRestType":
    case "TSNamedTupleMember":
    case "TSUnionType":
    case "TSIntersectionType":
    case "TSConditionalType":
    case "TSInferType":
    case "TSParenthesizedType":
    case "TSTypeOperator":
    case "TSIndexedAccessType":
    case "TSMappedType":
    case "TSLiteralType":
    case "TSExpressionWithTypeArguments":
    case "TSInterfaceDeclaration":
    case "TSInterfaceBody":
    case "TSTypeAliasDeclaration":
    case "TSInstantiationExpression":
    case "TSAsExpression":
    case "TSSatisfiesExpression":
    case "TSTypeAssertion":
    case "TSEnumDeclaration":
    case "TSEnumMember":
    case "TSModuleDeclaration":
    case "TSModuleBlock":
    case "TSImportType":
    case "TSImportEqualsDeclaration":
    case "TSExternalModuleReference":
    case "TSNonNullExpression":
    case "TSExportAssignment":
    case "TSNamespaceExportDeclaration":
    case "TSTypeAnnotation":
    case "TSTypeParameterInstantiation":
    case "TSTypeParameterDeclaration":
    case "TSTypeParameter":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSTypeElement(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "TSCallSignatureDeclaration":
    case "TSConstructSignatureDeclaration":
    case "TSPropertySignature":
    case "TSMethodSignature":
    case "TSIndexSignature":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSType(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "TSAnyKeyword":
    case "TSBooleanKeyword":
    case "TSBigIntKeyword":
    case "TSIntrinsicKeyword":
    case "TSNeverKeyword":
    case "TSNullKeyword":
    case "TSNumberKeyword":
    case "TSObjectKeyword":
    case "TSStringKeyword":
    case "TSSymbolKeyword":
    case "TSUndefinedKeyword":
    case "TSUnknownKeyword":
    case "TSVoidKeyword":
    case "TSThisType":
    case "TSFunctionType":
    case "TSConstructorType":
    case "TSTypeReference":
    case "TSTypePredicate":
    case "TSTypeQuery":
    case "TSTypeLiteral":
    case "TSArrayType":
    case "TSTupleType":
    case "TSOptionalType":
    case "TSRestType":
    case "TSUnionType":
    case "TSIntersectionType":
    case "TSConditionalType":
    case "TSInferType":
    case "TSParenthesizedType":
    case "TSTypeOperator":
    case "TSIndexedAccessType":
    case "TSMappedType":
    case "TSLiteralType":
    case "TSExpressionWithTypeArguments":
    case "TSImportType":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isTSBaseType(node, opts) {
  if (!node) return false;
  switch (node.type) {
    case "TSAnyKeyword":
    case "TSBooleanKeyword":
    case "TSBigIntKeyword":
    case "TSIntrinsicKeyword":
    case "TSNeverKeyword":
    case "TSNullKeyword":
    case "TSNumberKeyword":
    case "TSObjectKeyword":
    case "TSStringKeyword":
    case "TSSymbolKeyword":
    case "TSUndefinedKeyword":
    case "TSUnknownKeyword":
    case "TSVoidKeyword":
    case "TSThisType":
    case "TSLiteralType":
      break;
    default:
      return false;
  }
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isNumberLiteral(node, opts) {
  (0, _deprecationWarning.default)("isNumberLiteral", "isNumericLiteral");
  if (!node) return false;
  if (node.type !== "NumberLiteral") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isRegexLiteral(node, opts) {
  (0, _deprecationWarning.default)("isRegexLiteral", "isRegExpLiteral");
  if (!node) return false;
  if (node.type !== "RegexLiteral") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isRestProperty(node, opts) {
  (0, _deprecationWarning.default)("isRestProperty", "isRestElement");
  if (!node) return false;
  if (node.type !== "RestProperty") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isSpreadProperty(node, opts) {
  (0, _deprecationWarning.default)("isSpreadProperty", "isSpreadElement");
  if (!node) return false;
  if (node.type !== "SpreadProperty") return false;
  return opts == null || (0, _shallowEqual.default)(node, opts);
}
function isModuleDeclaration(node, opts) {
  (0, _deprecationWarning.default)("isModuleDeclaration", "isImportOrExportDeclaration");
  return isImportOrExportDeclaration(node, opts);
}



},{"../../utils/deprecationWarning.js":81,"../../utils/shallowEqual.js":84}],87:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = is;
var _shallowEqual = require("../utils/shallowEqual.js");
var _isType = require("./isType.js");
var _isPlaceholderType = require("./isPlaceholderType.js");
var _index = require("../definitions/index.js");
function is(type, node, opts) {
  if (!node) return false;
  const matches = (0, _isType.default)(node.type, type);
  if (!matches) {
    if (!opts && node.type === "Placeholder" && type in _index.FLIPPED_ALIAS_KEYS) {
      return (0, _isPlaceholderType.default)(node.expectedNode, type);
    }
    return false;
  }
  if (typeof opts === "undefined") {
    return true;
  } else {
    return (0, _shallowEqual.default)(node, opts);
  }
}



},{"../definitions/index.js":63,"../utils/shallowEqual.js":84,"./isPlaceholderType.js":94,"./isType.js":98}],88:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = isBinding;
var _getBindingIdentifiers = require("../retrievers/getBindingIdentifiers.js");
function isBinding(node, parent, grandparent) {
  if (grandparent && node.type === "Identifier" && parent.type === "ObjectProperty" && grandparent.type === "ObjectExpression") {
    return false;
  }
  const keys = _getBindingIdentifiers.default.keys[parent.type];
  if (keys) {
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const val = parent[key];
      if (Array.isArray(val)) {
        if (val.indexOf(node) >= 0) return true;
      } else {
        if (val === node) return true;
      }
    }
  }
  return false;
}



},{"../retrievers/getBindingIdentifiers.js":77}],89:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = isBlockScoped;
var _index = require("./generated/index.js");
var _isLet = require("./isLet.js");
function isBlockScoped(node) {
  return (0, _index.isFunctionDeclaration)(node) || (0, _index.isClassDeclaration)(node) || (0, _isLet.default)(node);
}



},{"./generated/index.js":86,"./isLet.js":91}],90:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = isImmutable;
var _isType = require("./isType.js");
var _index = require("./generated/index.js");
function isImmutable(node) {
  if ((0, _isType.default)(node.type, "Immutable")) return true;
  if ((0, _index.isIdentifier)(node)) {
    if (node.name === "undefined") {
      return true;
    } else {
      return false;
    }
  }
  return false;
}



},{"./generated/index.js":86,"./isType.js":98}],91:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = isLet;
var _index = require("./generated/index.js");
var _index2 = require("../constants/index.js");
function isLet(node) {
  return (0, _index.isVariableDeclaration)(node) && (node.kind !== "var" || node[_index2.BLOCK_SCOPED_SYMBOL]);
}



},{"../constants/index.js":47,"./generated/index.js":86}],92:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = isNode;
var _index = require("../definitions/index.js");
function isNode(node) {
  return !!(node && _index.VISITOR_KEYS[node.type]);
}



},{"../definitions/index.js":63}],93:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = isNodesEquivalent;
var _index = require("../definitions/index.js");
function isNodesEquivalent(a, b) {
  if (typeof a !== "object" || typeof b !== "object" || a == null || b == null) {
    return a === b;
  }
  if (a.type !== b.type) {
    return false;
  }
  const fields = Object.keys(_index.NODE_FIELDS[a.type] || a.type);
  const visitorKeys = _index.VISITOR_KEYS[a.type];
  for (const field of fields) {
    const val_a = a[field];
    const val_b = b[field];
    if (typeof val_a !== typeof val_b) {
      return false;
    }
    if (val_a == null && val_b == null) {
      continue;
    } else if (val_a == null || val_b == null) {
      return false;
    }
    if (Array.isArray(val_a)) {
      if (!Array.isArray(val_b)) {
        return false;
      }
      if (val_a.length !== val_b.length) {
        return false;
      }
      for (let i = 0; i < val_a.length; i++) {
        if (!isNodesEquivalent(val_a[i], val_b[i])) {
          return false;
        }
      }
      continue;
    }
    if (typeof val_a === "object" && !(visitorKeys != null && visitorKeys.includes(field))) {
      for (const key of Object.keys(val_a)) {
        if (val_a[key] !== val_b[key]) {
          return false;
        }
      }
      continue;
    }
    if (!isNodesEquivalent(val_a, val_b)) {
      return false;
    }
  }
  return true;
}



},{"../definitions/index.js":63}],94:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = isPlaceholderType;
var _index = require("../definitions/index.js");
function isPlaceholderType(placeholderType, targetType) {
  if (placeholderType === targetType) return true;
  const aliases = _index.PLACEHOLDERS_ALIAS[placeholderType];
  if (aliases) {
    for (const alias of aliases) {
      if (targetType === alias) return true;
    }
  }
  return false;
}



},{"../definitions/index.js":63}],95:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = isReferenced;
function isReferenced(node, parent, grandparent) {
  switch (parent.type) {
    case "MemberExpression":
    case "OptionalMemberExpression":
      if (parent.property === node) {
        return !!parent.computed;
      }
      return parent.object === node;
    case "JSXMemberExpression":
      return parent.object === node;
    case "VariableDeclarator":
      return parent.init === node;
    case "ArrowFunctionExpression":
      return parent.body === node;
    case "PrivateName":
      return false;
    case "ClassMethod":
    case "ClassPrivateMethod":
    case "ObjectMethod":
      if (parent.key === node) {
        return !!parent.computed;
      }
      return false;
    case "ObjectProperty":
      if (parent.key === node) {
        return !!parent.computed;
      }
      return !grandparent || grandparent.type !== "ObjectPattern";
    case "ClassProperty":
    case "ClassAccessorProperty":
      if (parent.key === node) {
        return !!parent.computed;
      }
      return true;
    case "ClassPrivateProperty":
      return parent.key !== node;
    case "ClassDeclaration":
    case "ClassExpression":
      return parent.superClass === node;
    case "AssignmentExpression":
      return parent.right === node;
    case "AssignmentPattern":
      return parent.right === node;
    case "LabeledStatement":
      return false;
    case "CatchClause":
      return false;
    case "RestElement":
      return false;
    case "BreakStatement":
    case "ContinueStatement":
      return false;
    case "FunctionDeclaration":
    case "FunctionExpression":
      return false;
    case "ExportNamespaceSpecifier":
    case "ExportDefaultSpecifier":
      return false;
    case "ExportSpecifier":
      if (grandparent != null && grandparent.source) {
        return false;
      }
      return parent.local === node;
    case "ImportDefaultSpecifier":
    case "ImportNamespaceSpecifier":
    case "ImportSpecifier":
      return false;
    case "ImportAttribute":
      return false;
    case "JSXAttribute":
      return false;
    case "ObjectPattern":
    case "ArrayPattern":
      return false;
    case "MetaProperty":
      return false;
    case "ObjectTypeProperty":
      return parent.key !== node;
    case "TSEnumMember":
      return parent.id !== node;
    case "TSPropertySignature":
      if (parent.key === node) {
        return !!parent.computed;
      }
      return true;
  }
  return true;
}



},{}],96:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = isScope;
var _index = require("./generated/index.js");
function isScope(node, parent) {
  if ((0, _index.isBlockStatement)(node) && ((0, _index.isFunction)(parent) || (0, _index.isCatchClause)(parent))) {
    return false;
  }
  if ((0, _index.isPattern)(node) && ((0, _index.isFunction)(parent) || (0, _index.isCatchClause)(parent))) {
    return true;
  }
  return (0, _index.isScopable)(node);
}



},{"./generated/index.js":86}],97:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = isSpecifierDefault;
var _index = require("./generated/index.js");
function isSpecifierDefault(specifier) {
  return (0, _index.isImportDefaultSpecifier)(specifier) || (0, _index.isIdentifier)(specifier.imported || specifier.exported, {
    name: "default"
  });
}



},{"./generated/index.js":86}],98:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = isType;
var _index = require("../definitions/index.js");
function isType(nodeType, targetType) {
  if (nodeType === targetType) return true;
  if (nodeType == null) return false;
  if (_index.ALIAS_KEYS[targetType]) return false;
  const aliases = _index.FLIPPED_ALIAS_KEYS[targetType];
  if (aliases) {
    if (aliases[0] === nodeType) return true;
    for (const alias of aliases) {
      if (nodeType === alias) return true;
    }
  }
  return false;
}



},{"../definitions/index.js":63}],99:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = isValidES3Identifier;
var _isValidIdentifier = require("./isValidIdentifier.js");
const RESERVED_WORDS_ES3_ONLY = new Set(["abstract", "boolean", "byte", "char", "double", "enum", "final", "float", "goto", "implements", "int", "interface", "long", "native", "package", "private", "protected", "public", "short", "static", "synchronized", "throws", "transient", "volatile"]);
function isValidES3Identifier(name) {
  return (0, _isValidIdentifier.default)(name) && !RESERVED_WORDS_ES3_ONLY.has(name);
}



},{"./isValidIdentifier.js":100}],100:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = isValidIdentifier;
var _helperValidatorIdentifier = require("@babel/helper-validator-identifier");
function isValidIdentifier(name, reserved = true) {
  if (typeof name !== "string") return false;
  if (reserved) {
    if ((0, _helperValidatorIdentifier.isKeyword)(name) || (0, _helperValidatorIdentifier.isStrictReservedWord)(name, true)) {
      return false;
    }
  }
  return (0, _helperValidatorIdentifier.isIdentifierName)(name);
}



},{"@babel/helper-validator-identifier":22}],101:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = isVar;
var _index = require("./generated/index.js");
var _index2 = require("../constants/index.js");
function isVar(node) {
  return (0, _index.isVariableDeclaration)(node, {
    kind: "var"
  }) && !node[_index2.BLOCK_SCOPED_SYMBOL];
}



},{"../constants/index.js":47,"./generated/index.js":86}],102:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = matchesPattern;
var _index = require("./generated/index.js");
function matchesPattern(member, match, allowPartial) {
  if (!(0, _index.isMemberExpression)(member)) return false;
  const parts = Array.isArray(match) ? match : match.split(".");
  const nodes = [];
  let node;
  for (node = member; (0, _index.isMemberExpression)(node); node = node.object) {
    nodes.push(node.property);
  }
  nodes.push(node);
  if (nodes.length < parts.length) return false;
  if (!allowPartial && nodes.length > parts.length) return false;
  for (let i = 0, j = nodes.length - 1; i < parts.length; i++, j--) {
    const node = nodes[j];
    let value;
    if ((0, _index.isIdentifier)(node)) {
      value = node.name;
    } else if ((0, _index.isStringLiteral)(node)) {
      value = node.value;
    } else if ((0, _index.isThisExpression)(node)) {
      value = "this";
    } else {
      return false;
    }
    if (parts[i] !== value) return false;
  }
  return true;
}



},{"./generated/index.js":86}],103:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = isCompatTag;
function isCompatTag(tagName) {
  return !!tagName && /^[a-z]/.test(tagName);
}



},{}],104:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _buildMatchMemberExpression = require("../buildMatchMemberExpression.js");
const isReactComponent = (0, _buildMatchMemberExpression.default)("React.Component");
var _default = exports.default = isReactComponent;



},{"../buildMatchMemberExpression.js":85}],105:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = validate;
exports.validateChild = validateChild;
exports.validateField = validateField;
var _index = require("../definitions/index.js");
function validate(node, key, val) {
  if (!node) return;
  const fields = _index.NODE_FIELDS[node.type];
  if (!fields) return;
  const field = fields[key];
  validateField(node, key, val, field);
  validateChild(node, key, val);
}
function validateField(node, key, val, field) {
  if (!(field != null && field.validate)) return;
  if (field.optional && val == null) return;
  field.validate(node, key, val);
}
function validateChild(node, key, val) {
  if (val == null) return;
  const validate = _index.NODE_PARENT_VALIDATIONS[val.type];
  if (!validate) return;
  validate(node, key, val);
}



},{"../definitions/index.js":63}],106:[function(require,module,exports){
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@jridgewell/set-array'), require('@jridgewell/sourcemap-codec'), require('@jridgewell/trace-mapping')) :
    typeof define === 'function' && define.amd ? define(['exports', '@jridgewell/set-array', '@jridgewell/sourcemap-codec', '@jridgewell/trace-mapping'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.genMapping = {}, global.setArray, global.sourcemapCodec, global.traceMapping));
})(this, (function (exports, setArray, sourcemapCodec, traceMapping) { 'use strict';

    const COLUMN = 0;
    const SOURCES_INDEX = 1;
    const SOURCE_LINE = 2;
    const SOURCE_COLUMN = 3;
    const NAMES_INDEX = 4;

    const NO_NAME = -1;
    /**
     * A low-level API to associate a generated position with an original source position. Line and
     * column here are 0-based, unlike `addMapping`.
     */
    exports.addSegment = void 0;
    /**
     * A high-level API to associate a generated position with an original source position. Line is
     * 1-based, but column is 0-based, due to legacy behavior in `source-map` library.
     */
    exports.addMapping = void 0;
    /**
     * Same as `addSegment`, but will only add the segment if it generates useful information in the
     * resulting map. This only works correctly if segments are added **in order**, meaning you should
     * not add a segment with a lower generated line/column than one that came before.
     */
    exports.maybeAddSegment = void 0;
    /**
     * Same as `addMapping`, but will only add the mapping if it generates useful information in the
     * resulting map. This only works correctly if mappings are added **in order**, meaning you should
     * not add a mapping with a lower generated line/column than one that came before.
     */
    exports.maybeAddMapping = void 0;
    /**
     * Adds/removes the content of the source file to the source map.
     */
    exports.setSourceContent = void 0;
    /**
     * Returns a sourcemap object (with decoded mappings) suitable for passing to a library that expects
     * a sourcemap, or to JSON.stringify.
     */
    exports.toDecodedMap = void 0;
    /**
     * Returns a sourcemap object (with encoded mappings) suitable for passing to a library that expects
     * a sourcemap, or to JSON.stringify.
     */
    exports.toEncodedMap = void 0;
    /**
     * Constructs a new GenMapping, using the already present mappings of the input.
     */
    exports.fromMap = void 0;
    /**
     * Returns an array of high-level mapping objects for every recorded segment, which could then be
     * passed to the `source-map` library.
     */
    exports.allMappings = void 0;
    // This split declaration is only so that terser can elminiate the static initialization block.
    let addSegmentInternal;
    /**
     * Provides the state to generate a sourcemap.
     */
    class GenMapping {
        constructor({ file, sourceRoot } = {}) {
            this._names = new setArray.SetArray();
            this._sources = new setArray.SetArray();
            this._sourcesContent = [];
            this._mappings = [];
            this.file = file;
            this.sourceRoot = sourceRoot;
        }
    }
    (() => {
        exports.addSegment = (map, genLine, genColumn, source, sourceLine, sourceColumn, name, content) => {
            return addSegmentInternal(false, map, genLine, genColumn, source, sourceLine, sourceColumn, name, content);
        };
        exports.maybeAddSegment = (map, genLine, genColumn, source, sourceLine, sourceColumn, name, content) => {
            return addSegmentInternal(true, map, genLine, genColumn, source, sourceLine, sourceColumn, name, content);
        };
        exports.addMapping = (map, mapping) => {
            return addMappingInternal(false, map, mapping);
        };
        exports.maybeAddMapping = (map, mapping) => {
            return addMappingInternal(true, map, mapping);
        };
        exports.setSourceContent = (map, source, content) => {
            const { _sources: sources, _sourcesContent: sourcesContent } = map;
            sourcesContent[setArray.put(sources, source)] = content;
        };
        exports.toDecodedMap = (map) => {
            const { file, sourceRoot, _mappings: mappings, _sources: sources, _sourcesContent: sourcesContent, _names: names, } = map;
            removeEmptyFinalLines(mappings);
            return {
                version: 3,
                file: file || undefined,
                names: names.array,
                sourceRoot: sourceRoot || undefined,
                sources: sources.array,
                sourcesContent,
                mappings,
            };
        };
        exports.toEncodedMap = (map) => {
            const decoded = exports.toDecodedMap(map);
            return Object.assign(Object.assign({}, decoded), { mappings: sourcemapCodec.encode(decoded.mappings) });
        };
        exports.allMappings = (map) => {
            const out = [];
            const { _mappings: mappings, _sources: sources, _names: names } = map;
            for (let i = 0; i < mappings.length; i++) {
                const line = mappings[i];
                for (let j = 0; j < line.length; j++) {
                    const seg = line[j];
                    const generated = { line: i + 1, column: seg[COLUMN] };
                    let source = undefined;
                    let original = undefined;
                    let name = undefined;
                    if (seg.length !== 1) {
                        source = sources.array[seg[SOURCES_INDEX]];
                        original = { line: seg[SOURCE_LINE] + 1, column: seg[SOURCE_COLUMN] };
                        if (seg.length === 5)
                            name = names.array[seg[NAMES_INDEX]];
                    }
                    out.push({ generated, source, original, name });
                }
            }
            return out;
        };
        exports.fromMap = (input) => {
            const map = new traceMapping.TraceMap(input);
            const gen = new GenMapping({ file: map.file, sourceRoot: map.sourceRoot });
            putAll(gen._names, map.names);
            putAll(gen._sources, map.sources);
            gen._sourcesContent = map.sourcesContent || map.sources.map(() => null);
            gen._mappings = traceMapping.decodedMappings(map);
            return gen;
        };
        // Internal helpers
        addSegmentInternal = (skipable, map, genLine, genColumn, source, sourceLine, sourceColumn, name, content) => {
            const { _mappings: mappings, _sources: sources, _sourcesContent: sourcesContent, _names: names, } = map;
            const line = getLine(mappings, genLine);
            const index = getColumnIndex(line, genColumn);
            if (!source) {
                if (skipable && skipSourceless(line, index))
                    return;
                return insert(line, index, [genColumn]);
            }
            const sourcesIndex = setArray.put(sources, source);
            const namesIndex = name ? setArray.put(names, name) : NO_NAME;
            if (sourcesIndex === sourcesContent.length)
                sourcesContent[sourcesIndex] = content !== null && content !== void 0 ? content : null;
            if (skipable && skipSource(line, index, sourcesIndex, sourceLine, sourceColumn, namesIndex)) {
                return;
            }
            return insert(line, index, name
                ? [genColumn, sourcesIndex, sourceLine, sourceColumn, namesIndex]
                : [genColumn, sourcesIndex, sourceLine, sourceColumn]);
        };
    })();
    function getLine(mappings, index) {
        for (let i = mappings.length; i <= index; i++) {
            mappings[i] = [];
        }
        return mappings[index];
    }
    function getColumnIndex(line, genColumn) {
        let index = line.length;
        for (let i = index - 1; i >= 0; index = i--) {
            const current = line[i];
            if (genColumn >= current[COLUMN])
                break;
        }
        return index;
    }
    function insert(array, index, value) {
        for (let i = array.length; i > index; i--) {
            array[i] = array[i - 1];
        }
        array[index] = value;
    }
    function removeEmptyFinalLines(mappings) {
        const { length } = mappings;
        let len = length;
        for (let i = len - 1; i >= 0; len = i, i--) {
            if (mappings[i].length > 0)
                break;
        }
        if (len < length)
            mappings.length = len;
    }
    function putAll(strarr, array) {
        for (let i = 0; i < array.length; i++)
            setArray.put(strarr, array[i]);
    }
    function skipSourceless(line, index) {
        // The start of a line is already sourceless, so adding a sourceless segment to the beginning
        // doesn't generate any useful information.
        if (index === 0)
            return true;
        const prev = line[index - 1];
        // If the previous segment is also sourceless, then adding another sourceless segment doesn't
        // genrate any new information. Else, this segment will end the source/named segment and point to
        // a sourceless position, which is useful.
        return prev.length === 1;
    }
    function skipSource(line, index, sourcesIndex, sourceLine, sourceColumn, namesIndex) {
        // A source/named segment at the start of a line gives position at that genColumn
        if (index === 0)
            return false;
        const prev = line[index - 1];
        // If the previous segment is sourceless, then we're transitioning to a source.
        if (prev.length === 1)
            return false;
        // If the previous segment maps to the exact same source position, then this segment doesn't
        // provide any new position information.
        return (sourcesIndex === prev[SOURCES_INDEX] &&
            sourceLine === prev[SOURCE_LINE] &&
            sourceColumn === prev[SOURCE_COLUMN] &&
            namesIndex === (prev.length === 5 ? prev[NAMES_INDEX] : NO_NAME));
    }
    function addMappingInternal(skipable, map, mapping) {
        const { generated, source, original, name, content } = mapping;
        if (!source) {
            return addSegmentInternal(skipable, map, generated.line - 1, generated.column, null, null, null, null, null);
        }
        const s = source;
        return addSegmentInternal(skipable, map, generated.line - 1, generated.column, s, original.line - 1, original.column, name, content);
    }

    exports.GenMapping = GenMapping;

    Object.defineProperty(exports, '__esModule', { value: true });

}));


},{"@jridgewell/set-array":108,"@jridgewell/sourcemap-codec":109,"@jridgewell/trace-mapping":110}],107:[function(require,module,exports){
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.resolveURI = factory());
})(this, (function () { 'use strict';

    // Matches the scheme of a URL, eg "http://"
    const schemeRegex = /^[\w+.-]+:\/\//;
    /**
     * Matches the parts of a URL:
     * 1. Scheme, including ":", guaranteed.
     * 2. User/password, including "@", optional.
     * 3. Host, guaranteed.
     * 4. Port, including ":", optional.
     * 5. Path, including "/", optional.
     * 6. Query, including "?", optional.
     * 7. Hash, including "#", optional.
     */
    const urlRegex = /^([\w+.-]+:)\/\/([^@/#?]*@)?([^:/#?]*)(:\d+)?(\/[^#?]*)?(\?[^#]*)?(#.*)?/;
    /**
     * File URLs are weird. They dont' need the regular `//` in the scheme, they may or may not start
     * with a leading `/`, they can have a domain (but only if they don't start with a Windows drive).
     *
     * 1. Host, optional.
     * 2. Path, which may include "/", guaranteed.
     * 3. Query, including "?", optional.
     * 4. Hash, including "#", optional.
     */
    const fileRegex = /^file:(?:\/\/((?![a-z]:)[^/#?]*)?)?(\/?[^#?]*)(\?[^#]*)?(#.*)?/i;
    var UrlType;
    (function (UrlType) {
        UrlType[UrlType["Empty"] = 1] = "Empty";
        UrlType[UrlType["Hash"] = 2] = "Hash";
        UrlType[UrlType["Query"] = 3] = "Query";
        UrlType[UrlType["RelativePath"] = 4] = "RelativePath";
        UrlType[UrlType["AbsolutePath"] = 5] = "AbsolutePath";
        UrlType[UrlType["SchemeRelative"] = 6] = "SchemeRelative";
        UrlType[UrlType["Absolute"] = 7] = "Absolute";
    })(UrlType || (UrlType = {}));
    function isAbsoluteUrl(input) {
        return schemeRegex.test(input);
    }
    function isSchemeRelativeUrl(input) {
        return input.startsWith('//');
    }
    function isAbsolutePath(input) {
        return input.startsWith('/');
    }
    function isFileUrl(input) {
        return input.startsWith('file:');
    }
    function isRelative(input) {
        return /^[.?#]/.test(input);
    }
    function parseAbsoluteUrl(input) {
        const match = urlRegex.exec(input);
        return makeUrl(match[1], match[2] || '', match[3], match[4] || '', match[5] || '/', match[6] || '', match[7] || '');
    }
    function parseFileUrl(input) {
        const match = fileRegex.exec(input);
        const path = match[2];
        return makeUrl('file:', '', match[1] || '', '', isAbsolutePath(path) ? path : '/' + path, match[3] || '', match[4] || '');
    }
    function makeUrl(scheme, user, host, port, path, query, hash) {
        return {
            scheme,
            user,
            host,
            port,
            path,
            query,
            hash,
            type: UrlType.Absolute,
        };
    }
    function parseUrl(input) {
        if (isSchemeRelativeUrl(input)) {
            const url = parseAbsoluteUrl('http:' + input);
            url.scheme = '';
            url.type = UrlType.SchemeRelative;
            return url;
        }
        if (isAbsolutePath(input)) {
            const url = parseAbsoluteUrl('http://foo.com' + input);
            url.scheme = '';
            url.host = '';
            url.type = UrlType.AbsolutePath;
            return url;
        }
        if (isFileUrl(input))
            return parseFileUrl(input);
        if (isAbsoluteUrl(input))
            return parseAbsoluteUrl(input);
        const url = parseAbsoluteUrl('http://foo.com/' + input);
        url.scheme = '';
        url.host = '';
        url.type = input
            ? input.startsWith('?')
                ? UrlType.Query
                : input.startsWith('#')
                    ? UrlType.Hash
                    : UrlType.RelativePath
            : UrlType.Empty;
        return url;
    }
    function stripPathFilename(path) {
        // If a path ends with a parent directory "..", then it's a relative path with excess parent
        // paths. It's not a file, so we can't strip it.
        if (path.endsWith('/..'))
            return path;
        const index = path.lastIndexOf('/');
        return path.slice(0, index + 1);
    }
    function mergePaths(url, base) {
        normalizePath(base, base.type);
        // If the path is just a "/", then it was an empty path to begin with (remember, we're a relative
        // path).
        if (url.path === '/') {
            url.path = base.path;
        }
        else {
            // Resolution happens relative to the base path's directory, not the file.
            url.path = stripPathFilename(base.path) + url.path;
        }
    }
    /**
     * The path can have empty directories "//", unneeded parents "foo/..", or current directory
     * "foo/.". We need to normalize to a standard representation.
     */
    function normalizePath(url, type) {
        const rel = type <= UrlType.RelativePath;
        const pieces = url.path.split('/');
        // We need to preserve the first piece always, so that we output a leading slash. The item at
        // pieces[0] is an empty string.
        let pointer = 1;
        // Positive is the number of real directories we've output, used for popping a parent directory.
        // Eg, "foo/bar/.." will have a positive 2, and we can decrement to be left with just "foo".
        let positive = 0;
        // We need to keep a trailing slash if we encounter an empty directory (eg, splitting "foo/" will
        // generate `["foo", ""]` pieces). And, if we pop a parent directory. But once we encounter a
        // real directory, we won't need to append, unless the other conditions happen again.
        let addTrailingSlash = false;
        for (let i = 1; i < pieces.length; i++) {
            const piece = pieces[i];
            // An empty directory, could be a trailing slash, or just a double "//" in the path.
            if (!piece) {
                addTrailingSlash = true;
                continue;
            }
            // If we encounter a real directory, then we don't need to append anymore.
            addTrailingSlash = false;
            // A current directory, which we can always drop.
            if (piece === '.')
                continue;
            // A parent directory, we need to see if there are any real directories we can pop. Else, we
            // have an excess of parents, and we'll need to keep the "..".
            if (piece === '..') {
                if (positive) {
                    addTrailingSlash = true;
                    positive--;
                    pointer--;
                }
                else if (rel) {
                    // If we're in a relativePath, then we need to keep the excess parents. Else, in an absolute
                    // URL, protocol relative URL, or an absolute path, we don't need to keep excess.
                    pieces[pointer++] = piece;
                }
                continue;
            }
            // We've encountered a real directory. Move it to the next insertion pointer, which accounts for
            // any popped or dropped directories.
            pieces[pointer++] = piece;
            positive++;
        }
        let path = '';
        for (let i = 1; i < pointer; i++) {
            path += '/' + pieces[i];
        }
        if (!path || (addTrailingSlash && !path.endsWith('/..'))) {
            path += '/';
        }
        url.path = path;
    }
    /**
     * Attempts to resolve `input` URL/path relative to `base`.
     */
    function resolve(input, base) {
        if (!input && !base)
            return '';
        const url = parseUrl(input);
        let inputType = url.type;
        if (base && inputType !== UrlType.Absolute) {
            const baseUrl = parseUrl(base);
            const baseType = baseUrl.type;
            switch (inputType) {
                case UrlType.Empty:
                    url.hash = baseUrl.hash;
                // fall through
                case UrlType.Hash:
                    url.query = baseUrl.query;
                // fall through
                case UrlType.Query:
                case UrlType.RelativePath:
                    mergePaths(url, baseUrl);
                // fall through
                case UrlType.AbsolutePath:
                    // The host, user, and port are joined, you can't copy one without the others.
                    url.user = baseUrl.user;
                    url.host = baseUrl.host;
                    url.port = baseUrl.port;
                // fall through
                case UrlType.SchemeRelative:
                    // The input doesn't have a schema at least, so we need to copy at least that over.
                    url.scheme = baseUrl.scheme;
            }
            if (baseType > inputType)
                inputType = baseType;
        }
        normalizePath(url, inputType);
        const queryHash = url.query + url.hash;
        switch (inputType) {
            // This is impossible, because of the empty checks at the start of the function.
            // case UrlType.Empty:
            case UrlType.Hash:
            case UrlType.Query:
                return queryHash;
            case UrlType.RelativePath: {
                // The first char is always a "/", and we need it to be relative.
                const path = url.path.slice(1);
                if (!path)
                    return queryHash || '.';
                if (isRelative(base || input) && !isRelative(path)) {
                    // If base started with a leading ".", or there is no base and input started with a ".",
                    // then we need to ensure that the relative path starts with a ".". We don't know if
                    // relative starts with a "..", though, so check before prepending.
                    return './' + path + queryHash;
                }
                return path + queryHash;
            }
            case UrlType.AbsolutePath:
                return url.path + queryHash;
            default:
                return url.scheme + '//' + url.user + url.host + url.port + url.path + queryHash;
        }
    }

    return resolve;

}));


},{}],108:[function(require,module,exports){
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.setArray = {}));
})(this, (function (exports) { 'use strict';

    /**
     * Gets the index associated with `key` in the backing array, if it is already present.
     */
    exports.get = void 0;
    /**
     * Puts `key` into the backing array, if it is not already present. Returns
     * the index of the `key` in the backing array.
     */
    exports.put = void 0;
    /**
     * Pops the last added item out of the SetArray.
     */
    exports.pop = void 0;
    /**
     * SetArray acts like a `Set` (allowing only one occurrence of a string `key`), but provides the
     * index of the `key` in the backing array.
     *
     * This is designed to allow synchronizing a second array with the contents of the backing array,
     * like how in a sourcemap `sourcesContent[i]` is the source content associated with `source[i]`,
     * and there are never duplicates.
     */
    class SetArray {
        constructor() {
            this._indexes = { __proto__: null };
            this.array = [];
        }
    }
    (() => {
        exports.get = (strarr, key) => strarr._indexes[key];
        exports.put = (strarr, key) => {
            // The key may or may not be present. If it is present, it's a number.
            const index = exports.get(strarr, key);
            if (index !== undefined)
                return index;
            const { array, _indexes: indexes } = strarr;
            return (indexes[key] = array.push(key) - 1);
        };
        exports.pop = (strarr) => {
            const { array, _indexes: indexes } = strarr;
            if (array.length === 0)
                return;
            const last = array.pop();
            indexes[last] = undefined;
        };
    })();

    exports.SetArray = SetArray;

    Object.defineProperty(exports, '__esModule', { value: true });

}));


},{}],109:[function(require,module,exports){
(function (Buffer){(function (){
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.sourcemapCodec = {}));
})(this, (function (exports) { 'use strict';

    const comma = ','.charCodeAt(0);
    const semicolon = ';'.charCodeAt(0);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const intToChar = new Uint8Array(64); // 64 possible chars.
    const charToInt = new Uint8Array(128); // z is 122 in ASCII
    for (let i = 0; i < chars.length; i++) {
        const c = chars.charCodeAt(i);
        intToChar[i] = c;
        charToInt[c] = i;
    }
    // Provide a fallback for older environments.
    const td = typeof TextDecoder !== 'undefined'
        ? /* #__PURE__ */ new TextDecoder()
        : typeof Buffer !== 'undefined'
            ? {
                decode(buf) {
                    const out = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);
                    return out.toString();
                },
            }
            : {
                decode(buf) {
                    let out = '';
                    for (let i = 0; i < buf.length; i++) {
                        out += String.fromCharCode(buf[i]);
                    }
                    return out;
                },
            };
    function decode(mappings) {
        const state = new Int32Array(5);
        const decoded = [];
        let index = 0;
        do {
            const semi = indexOf(mappings, index);
            const line = [];
            let sorted = true;
            let lastCol = 0;
            state[0] = 0;
            for (let i = index; i < semi; i++) {
                let seg;
                i = decodeInteger(mappings, i, state, 0); // genColumn
                const col = state[0];
                if (col < lastCol)
                    sorted = false;
                lastCol = col;
                if (hasMoreVlq(mappings, i, semi)) {
                    i = decodeInteger(mappings, i, state, 1); // sourcesIndex
                    i = decodeInteger(mappings, i, state, 2); // sourceLine
                    i = decodeInteger(mappings, i, state, 3); // sourceColumn
                    if (hasMoreVlq(mappings, i, semi)) {
                        i = decodeInteger(mappings, i, state, 4); // namesIndex
                        seg = [col, state[1], state[2], state[3], state[4]];
                    }
                    else {
                        seg = [col, state[1], state[2], state[3]];
                    }
                }
                else {
                    seg = [col];
                }
                line.push(seg);
            }
            if (!sorted)
                sort(line);
            decoded.push(line);
            index = semi + 1;
        } while (index <= mappings.length);
        return decoded;
    }
    function indexOf(mappings, index) {
        const idx = mappings.indexOf(';', index);
        return idx === -1 ? mappings.length : idx;
    }
    function decodeInteger(mappings, pos, state, j) {
        let value = 0;
        let shift = 0;
        let integer = 0;
        do {
            const c = mappings.charCodeAt(pos++);
            integer = charToInt[c];
            value |= (integer & 31) << shift;
            shift += 5;
        } while (integer & 32);
        const shouldNegate = value & 1;
        value >>>= 1;
        if (shouldNegate) {
            value = -0x80000000 | -value;
        }
        state[j] += value;
        return pos;
    }
    function hasMoreVlq(mappings, i, length) {
        if (i >= length)
            return false;
        return mappings.charCodeAt(i) !== comma;
    }
    function sort(line) {
        line.sort(sortComparator);
    }
    function sortComparator(a, b) {
        return a[0] - b[0];
    }
    function encode(decoded) {
        const state = new Int32Array(5);
        const bufLength = 1024 * 16;
        const subLength = bufLength - 36;
        const buf = new Uint8Array(bufLength);
        const sub = buf.subarray(0, subLength);
        let pos = 0;
        let out = '';
        for (let i = 0; i < decoded.length; i++) {
            const line = decoded[i];
            if (i > 0) {
                if (pos === bufLength) {
                    out += td.decode(buf);
                    pos = 0;
                }
                buf[pos++] = semicolon;
            }
            if (line.length === 0)
                continue;
            state[0] = 0;
            for (let j = 0; j < line.length; j++) {
                const segment = line[j];
                // We can push up to 5 ints, each int can take at most 7 chars, and we
                // may push a comma.
                if (pos > subLength) {
                    out += td.decode(sub);
                    buf.copyWithin(0, subLength, pos);
                    pos -= subLength;
                }
                if (j > 0)
                    buf[pos++] = comma;
                pos = encodeInteger(buf, pos, state, segment, 0); // genColumn
                if (segment.length === 1)
                    continue;
                pos = encodeInteger(buf, pos, state, segment, 1); // sourcesIndex
                pos = encodeInteger(buf, pos, state, segment, 2); // sourceLine
                pos = encodeInteger(buf, pos, state, segment, 3); // sourceColumn
                if (segment.length === 4)
                    continue;
                pos = encodeInteger(buf, pos, state, segment, 4); // namesIndex
            }
        }
        return out + td.decode(buf.subarray(0, pos));
    }
    function encodeInteger(buf, pos, state, segment, j) {
        const next = segment[j];
        let num = next - state[j];
        state[j] = next;
        num = num < 0 ? (-num << 1) | 1 : num << 1;
        do {
            let clamped = num & 0b011111;
            num >>>= 5;
            if (num > 0)
                clamped |= 0b100000;
            buf[pos++] = intToChar[clamped];
        } while (num > 0);
        return pos;
    }

    exports.decode = decode;
    exports.encode = encode;

    Object.defineProperty(exports, '__esModule', { value: true });

}));


}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":112}],110:[function(require,module,exports){
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@jridgewell/sourcemap-codec'), require('@jridgewell/resolve-uri')) :
    typeof define === 'function' && define.amd ? define(['exports', '@jridgewell/sourcemap-codec', '@jridgewell/resolve-uri'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.traceMapping = {}, global.sourcemapCodec, global.resolveURI));
})(this, (function (exports, sourcemapCodec, resolveUri) { 'use strict';

    function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

    var resolveUri__default = /*#__PURE__*/_interopDefaultLegacy(resolveUri);

    function resolve(input, base) {
        // The base is always treated as a directory, if it's not empty.
        // https://github.com/mozilla/source-map/blob/8cb3ee57/lib/util.js#L327
        // https://github.com/chromium/chromium/blob/da4adbb3/third_party/blink/renderer/devtools/front_end/sdk/SourceMap.js#L400-L401
        if (base && !base.endsWith('/'))
            base += '/';
        return resolveUri__default["default"](input, base);
    }

    /**
     * Removes everything after the last "/", but leaves the slash.
     */
    function stripFilename(path) {
        if (!path)
            return '';
        const index = path.lastIndexOf('/');
        return path.slice(0, index + 1);
    }

    const COLUMN = 0;
    const SOURCES_INDEX = 1;
    const SOURCE_LINE = 2;
    const SOURCE_COLUMN = 3;
    const NAMES_INDEX = 4;
    const REV_GENERATED_LINE = 1;
    const REV_GENERATED_COLUMN = 2;

    function maybeSort(mappings, owned) {
        const unsortedIndex = nextUnsortedSegmentLine(mappings, 0);
        if (unsortedIndex === mappings.length)
            return mappings;
        // If we own the array (meaning we parsed it from JSON), then we're free to directly mutate it. If
        // not, we do not want to modify the consumer's input array.
        if (!owned)
            mappings = mappings.slice();
        for (let i = unsortedIndex; i < mappings.length; i = nextUnsortedSegmentLine(mappings, i + 1)) {
            mappings[i] = sortSegments(mappings[i], owned);
        }
        return mappings;
    }
    function nextUnsortedSegmentLine(mappings, start) {
        for (let i = start; i < mappings.length; i++) {
            if (!isSorted(mappings[i]))
                return i;
        }
        return mappings.length;
    }
    function isSorted(line) {
        for (let j = 1; j < line.length; j++) {
            if (line[j][COLUMN] < line[j - 1][COLUMN]) {
                return false;
            }
        }
        return true;
    }
    function sortSegments(line, owned) {
        if (!owned)
            line = line.slice();
        return line.sort(sortComparator);
    }
    function sortComparator(a, b) {
        return a[COLUMN] - b[COLUMN];
    }

    let found = false;
    /**
     * A binary search implementation that returns the index if a match is found.
     * If no match is found, then the left-index (the index associated with the item that comes just
     * before the desired index) is returned. To maintain proper sort order, a splice would happen at
     * the next index:
     *
     * ```js
     * const array = [1, 3];
     * const needle = 2;
     * const index = binarySearch(array, needle, (item, needle) => item - needle);
     *
     * assert.equal(index, 0);
     * array.splice(index + 1, 0, needle);
     * assert.deepEqual(array, [1, 2, 3]);
     * ```
     */
    function binarySearch(haystack, needle, low, high) {
        while (low <= high) {
            const mid = low + ((high - low) >> 1);
            const cmp = haystack[mid][COLUMN] - needle;
            if (cmp === 0) {
                found = true;
                return mid;
            }
            if (cmp < 0) {
                low = mid + 1;
            }
            else {
                high = mid - 1;
            }
        }
        found = false;
        return low - 1;
    }
    function upperBound(haystack, needle, index) {
        for (let i = index + 1; i < haystack.length; index = i++) {
            if (haystack[i][COLUMN] !== needle)
                break;
        }
        return index;
    }
    function lowerBound(haystack, needle, index) {
        for (let i = index - 1; i >= 0; index = i--) {
            if (haystack[i][COLUMN] !== needle)
                break;
        }
        return index;
    }
    function memoizedState() {
        return {
            lastKey: -1,
            lastNeedle: -1,
            lastIndex: -1,
        };
    }
    /**
     * This overly complicated beast is just to record the last tested line/column and the resulting
     * index, allowing us to skip a few tests if mappings are monotonically increasing.
     */
    function memoizedBinarySearch(haystack, needle, state, key) {
        const { lastKey, lastNeedle, lastIndex } = state;
        let low = 0;
        let high = haystack.length - 1;
        if (key === lastKey) {
            if (needle === lastNeedle) {
                found = lastIndex !== -1 && haystack[lastIndex][COLUMN] === needle;
                return lastIndex;
            }
            if (needle >= lastNeedle) {
                // lastIndex may be -1 if the previous needle was not found.
                low = lastIndex === -1 ? 0 : lastIndex;
            }
            else {
                high = lastIndex;
            }
        }
        state.lastKey = key;
        state.lastNeedle = needle;
        return (state.lastIndex = binarySearch(haystack, needle, low, high));
    }

    // Rebuilds the original source files, with mappings that are ordered by source line/column instead
    // of generated line/column.
    function buildBySources(decoded, memos) {
        const sources = memos.map(buildNullArray);
        for (let i = 0; i < decoded.length; i++) {
            const line = decoded[i];
            for (let j = 0; j < line.length; j++) {
                const seg = line[j];
                if (seg.length === 1)
                    continue;
                const sourceIndex = seg[SOURCES_INDEX];
                const sourceLine = seg[SOURCE_LINE];
                const sourceColumn = seg[SOURCE_COLUMN];
                const originalSource = sources[sourceIndex];
                const originalLine = (originalSource[sourceLine] || (originalSource[sourceLine] = []));
                const memo = memos[sourceIndex];
                // The binary search either found a match, or it found the left-index just before where the
                // segment should go. Either way, we want to insert after that. And there may be multiple
                // generated segments associated with an original location, so there may need to move several
                // indexes before we find where we need to insert.
                const index = upperBound(originalLine, sourceColumn, memoizedBinarySearch(originalLine, sourceColumn, memo, sourceLine));
                insert(originalLine, (memo.lastIndex = index + 1), [sourceColumn, i, seg[COLUMN]]);
            }
        }
        return sources;
    }
    function insert(array, index, value) {
        for (let i = array.length; i > index; i--) {
            array[i] = array[i - 1];
        }
        array[index] = value;
    }
    // Null arrays allow us to use ordered index keys without actually allocating contiguous memory like
    // a real array. We use a null-prototype object to avoid prototype pollution and deoptimizations.
    // Numeric properties on objects are magically sorted in ascending order by the engine regardless of
    // the insertion order. So, by setting any numeric keys, even out of order, we'll get ascending
    // order when iterating with for-in.
    function buildNullArray() {
        return { __proto__: null };
    }

    const AnyMap = function (map, mapUrl) {
        const parsed = typeof map === 'string' ? JSON.parse(map) : map;
        if (!('sections' in parsed))
            return new TraceMap(parsed, mapUrl);
        const mappings = [];
        const sources = [];
        const sourcesContent = [];
        const names = [];
        recurse(parsed, mapUrl, mappings, sources, sourcesContent, names, 0, 0, Infinity, Infinity);
        const joined = {
            version: 3,
            file: parsed.file,
            names,
            sources,
            sourcesContent,
            mappings,
        };
        return exports.presortedDecodedMap(joined);
    };
    function recurse(input, mapUrl, mappings, sources, sourcesContent, names, lineOffset, columnOffset, stopLine, stopColumn) {
        const { sections } = input;
        for (let i = 0; i < sections.length; i++) {
            const { map, offset } = sections[i];
            let sl = stopLine;
            let sc = stopColumn;
            if (i + 1 < sections.length) {
                const nextOffset = sections[i + 1].offset;
                sl = Math.min(stopLine, lineOffset + nextOffset.line);
                if (sl === stopLine) {
                    sc = Math.min(stopColumn, columnOffset + nextOffset.column);
                }
                else if (sl < stopLine) {
                    sc = columnOffset + nextOffset.column;
                }
            }
            addSection(map, mapUrl, mappings, sources, sourcesContent, names, lineOffset + offset.line, columnOffset + offset.column, sl, sc);
        }
    }
    function addSection(input, mapUrl, mappings, sources, sourcesContent, names, lineOffset, columnOffset, stopLine, stopColumn) {
        if ('sections' in input)
            return recurse(...arguments);
        const map = new TraceMap(input, mapUrl);
        const sourcesOffset = sources.length;
        const namesOffset = names.length;
        const decoded = exports.decodedMappings(map);
        const { resolvedSources, sourcesContent: contents } = map;
        append(sources, resolvedSources);
        append(names, map.names);
        if (contents)
            append(sourcesContent, contents);
        else
            for (let i = 0; i < resolvedSources.length; i++)
                sourcesContent.push(null);
        for (let i = 0; i < decoded.length; i++) {
            const lineI = lineOffset + i;
            // We can only add so many lines before we step into the range that the next section's map
            // controls. When we get to the last line, then we'll start checking the segments to see if
            // they've crossed into the column range. But it may not have any columns that overstep, so we
            // still need to check that we don't overstep lines, too.
            if (lineI > stopLine)
                return;
            // The out line may already exist in mappings (if we're continuing the line started by a
            // previous section). Or, we may have jumped ahead several lines to start this section.
            const out = getLine(mappings, lineI);
            // On the 0th loop, the section's column offset shifts us forward. On all other lines (since the
            // map can be multiple lines), it doesn't.
            const cOffset = i === 0 ? columnOffset : 0;
            const line = decoded[i];
            for (let j = 0; j < line.length; j++) {
                const seg = line[j];
                const column = cOffset + seg[COLUMN];
                // If this segment steps into the column range that the next section's map controls, we need
                // to stop early.
                if (lineI === stopLine && column >= stopColumn)
                    return;
                if (seg.length === 1) {
                    out.push([column]);
                    continue;
                }
                const sourcesIndex = sourcesOffset + seg[SOURCES_INDEX];
                const sourceLine = seg[SOURCE_LINE];
                const sourceColumn = seg[SOURCE_COLUMN];
                out.push(seg.length === 4
                    ? [column, sourcesIndex, sourceLine, sourceColumn]
                    : [column, sourcesIndex, sourceLine, sourceColumn, namesOffset + seg[NAMES_INDEX]]);
            }
        }
    }
    function append(arr, other) {
        for (let i = 0; i < other.length; i++)
            arr.push(other[i]);
    }
    function getLine(arr, index) {
        for (let i = arr.length; i <= index; i++)
            arr[i] = [];
        return arr[index];
    }

    const LINE_GTR_ZERO = '`line` must be greater than 0 (lines start at line 1)';
    const COL_GTR_EQ_ZERO = '`column` must be greater than or equal to 0 (columns start at column 0)';
    const LEAST_UPPER_BOUND = -1;
    const GREATEST_LOWER_BOUND = 1;
    /**
     * Returns the encoded (VLQ string) form of the SourceMap's mappings field.
     */
    exports.encodedMappings = void 0;
    /**
     * Returns the decoded (array of lines of segments) form of the SourceMap's mappings field.
     */
    exports.decodedMappings = void 0;
    /**
     * A low-level API to find the segment associated with a generated line/column (think, from a
     * stack trace). Line and column here are 0-based, unlike `originalPositionFor`.
     */
    exports.traceSegment = void 0;
    /**
     * A higher-level API to find the source/line/column associated with a generated line/column
     * (think, from a stack trace). Line is 1-based, but column is 0-based, due to legacy behavior in
     * `source-map` library.
     */
    exports.originalPositionFor = void 0;
    /**
     * Finds the generated line/column position of the provided source/line/column source position.
     */
    exports.generatedPositionFor = void 0;
    /**
     * Finds all generated line/column positions of the provided source/line/column source position.
     */
    exports.allGeneratedPositionsFor = void 0;
    /**
     * Iterates each mapping in generated position order.
     */
    exports.eachMapping = void 0;
    /**
     * Retrieves the source content for a particular source, if its found. Returns null if not.
     */
    exports.sourceContentFor = void 0;
    /**
     * A helper that skips sorting of the input map's mappings array, which can be expensive for larger
     * maps.
     */
    exports.presortedDecodedMap = void 0;
    /**
     * Returns a sourcemap object (with decoded mappings) suitable for passing to a library that expects
     * a sourcemap, or to JSON.stringify.
     */
    exports.decodedMap = void 0;
    /**
     * Returns a sourcemap object (with encoded mappings) suitable for passing to a library that expects
     * a sourcemap, or to JSON.stringify.
     */
    exports.encodedMap = void 0;
    class TraceMap {
        constructor(map, mapUrl) {
            const isString = typeof map === 'string';
            if (!isString && map._decodedMemo)
                return map;
            const parsed = (isString ? JSON.parse(map) : map);
            const { version, file, names, sourceRoot, sources, sourcesContent } = parsed;
            this.version = version;
            this.file = file;
            this.names = names || [];
            this.sourceRoot = sourceRoot;
            this.sources = sources;
            this.sourcesContent = sourcesContent;
            const from = resolve(sourceRoot || '', stripFilename(mapUrl));
            this.resolvedSources = sources.map((s) => resolve(s || '', from));
            const { mappings } = parsed;
            if (typeof mappings === 'string') {
                this._encoded = mappings;
                this._decoded = undefined;
            }
            else {
                this._encoded = undefined;
                this._decoded = maybeSort(mappings, isString);
            }
            this._decodedMemo = memoizedState();
            this._bySources = undefined;
            this._bySourceMemos = undefined;
        }
    }
    (() => {
        exports.encodedMappings = (map) => {
            var _a;
            return ((_a = map._encoded) !== null && _a !== void 0 ? _a : (map._encoded = sourcemapCodec.encode(map._decoded)));
        };
        exports.decodedMappings = (map) => {
            return (map._decoded || (map._decoded = sourcemapCodec.decode(map._encoded)));
        };
        exports.traceSegment = (map, line, column) => {
            const decoded = exports.decodedMappings(map);
            // It's common for parent source maps to have pointers to lines that have no
            // mapping (like a "//# sourceMappingURL=") at the end of the child file.
            if (line >= decoded.length)
                return null;
            const segments = decoded[line];
            const index = traceSegmentInternal(segments, map._decodedMemo, line, column, GREATEST_LOWER_BOUND);
            return index === -1 ? null : segments[index];
        };
        exports.originalPositionFor = (map, { line, column, bias }) => {
            line--;
            if (line < 0)
                throw new Error(LINE_GTR_ZERO);
            if (column < 0)
                throw new Error(COL_GTR_EQ_ZERO);
            const decoded = exports.decodedMappings(map);
            // It's common for parent source maps to have pointers to lines that have no
            // mapping (like a "//# sourceMappingURL=") at the end of the child file.
            if (line >= decoded.length)
                return OMapping(null, null, null, null);
            const segments = decoded[line];
            const index = traceSegmentInternal(segments, map._decodedMemo, line, column, bias || GREATEST_LOWER_BOUND);
            if (index === -1)
                return OMapping(null, null, null, null);
            const segment = segments[index];
            if (segment.length === 1)
                return OMapping(null, null, null, null);
            const { names, resolvedSources } = map;
            return OMapping(resolvedSources[segment[SOURCES_INDEX]], segment[SOURCE_LINE] + 1, segment[SOURCE_COLUMN], segment.length === 5 ? names[segment[NAMES_INDEX]] : null);
        };
        exports.allGeneratedPositionsFor = (map, { source, line, column, bias }) => {
            // SourceMapConsumer uses LEAST_UPPER_BOUND for some reason, so we follow suit.
            return generatedPosition(map, source, line, column, bias || LEAST_UPPER_BOUND, true);
        };
        exports.generatedPositionFor = (map, { source, line, column, bias }) => {
            return generatedPosition(map, source, line, column, bias || GREATEST_LOWER_BOUND, false);
        };
        exports.eachMapping = (map, cb) => {
            const decoded = exports.decodedMappings(map);
            const { names, resolvedSources } = map;
            for (let i = 0; i < decoded.length; i++) {
                const line = decoded[i];
                for (let j = 0; j < line.length; j++) {
                    const seg = line[j];
                    const generatedLine = i + 1;
                    const generatedColumn = seg[0];
                    let source = null;
                    let originalLine = null;
                    let originalColumn = null;
                    let name = null;
                    if (seg.length !== 1) {
                        source = resolvedSources[seg[1]];
                        originalLine = seg[2] + 1;
                        originalColumn = seg[3];
                    }
                    if (seg.length === 5)
                        name = names[seg[4]];
                    cb({
                        generatedLine,
                        generatedColumn,
                        source,
                        originalLine,
                        originalColumn,
                        name,
                    });
                }
            }
        };
        exports.sourceContentFor = (map, source) => {
            const { sources, resolvedSources, sourcesContent } = map;
            if (sourcesContent == null)
                return null;
            let index = sources.indexOf(source);
            if (index === -1)
                index = resolvedSources.indexOf(source);
            return index === -1 ? null : sourcesContent[index];
        };
        exports.presortedDecodedMap = (map, mapUrl) => {
            const tracer = new TraceMap(clone(map, []), mapUrl);
            tracer._decoded = map.mappings;
            return tracer;
        };
        exports.decodedMap = (map) => {
            return clone(map, exports.decodedMappings(map));
        };
        exports.encodedMap = (map) => {
            return clone(map, exports.encodedMappings(map));
        };
        function generatedPosition(map, source, line, column, bias, all) {
            line--;
            if (line < 0)
                throw new Error(LINE_GTR_ZERO);
            if (column < 0)
                throw new Error(COL_GTR_EQ_ZERO);
            const { sources, resolvedSources } = map;
            let sourceIndex = sources.indexOf(source);
            if (sourceIndex === -1)
                sourceIndex = resolvedSources.indexOf(source);
            if (sourceIndex === -1)
                return all ? [] : GMapping(null, null);
            const generated = (map._bySources || (map._bySources = buildBySources(exports.decodedMappings(map), (map._bySourceMemos = sources.map(memoizedState)))));
            const segments = generated[sourceIndex][line];
            if (segments == null)
                return all ? [] : GMapping(null, null);
            const memo = map._bySourceMemos[sourceIndex];
            if (all)
                return sliceGeneratedPositions(segments, memo, line, column, bias);
            const index = traceSegmentInternal(segments, memo, line, column, bias);
            if (index === -1)
                return GMapping(null, null);
            const segment = segments[index];
            return GMapping(segment[REV_GENERATED_LINE] + 1, segment[REV_GENERATED_COLUMN]);
        }
    })();
    function clone(map, mappings) {
        return {
            version: map.version,
            file: map.file,
            names: map.names,
            sourceRoot: map.sourceRoot,
            sources: map.sources,
            sourcesContent: map.sourcesContent,
            mappings,
        };
    }
    function OMapping(source, line, column, name) {
        return { source, line, column, name };
    }
    function GMapping(line, column) {
        return { line, column };
    }
    function traceSegmentInternal(segments, memo, line, column, bias) {
        let index = memoizedBinarySearch(segments, column, memo, line);
        if (found) {
            index = (bias === LEAST_UPPER_BOUND ? upperBound : lowerBound)(segments, column, index);
        }
        else if (bias === LEAST_UPPER_BOUND)
            index++;
        if (index === -1 || index === segments.length)
            return -1;
        return index;
    }
    function sliceGeneratedPositions(segments, memo, line, column, bias) {
        let min = traceSegmentInternal(segments, memo, line, column, GREATEST_LOWER_BOUND);
        // We ignored the bias when tracing the segment so that we're guarnateed to find the first (in
        // insertion order) segment that matched. Even if we did respect the bias when tracing, we would
        // still need to call `lowerBound()` to find the first segment, which is slower than just looking
        // for the GREATEST_LOWER_BOUND to begin with. The only difference that matters for us is when the
        // binary search didn't match, in which case GREATEST_LOWER_BOUND just needs to increment to
        // match LEAST_UPPER_BOUND.
        if (!found && bias === LEAST_UPPER_BOUND)
            min++;
        if (min === -1 || min === segments.length)
            return [];
        // We may have found the segment that started at an earlier column. If this is the case, then we
        // need to slice all generated segments that match _that_ column, because all such segments span
        // to our desired column.
        const matchedColumn = found ? column : segments[min][COLUMN];
        // The binary search is not guaranteed to find the lower bound when a match wasn't found.
        if (!found)
            min = lowerBound(segments, matchedColumn, min);
        const max = upperBound(segments, matchedColumn, min);
        const result = [];
        for (; min <= max; min++) {
            const segment = segments[min];
            result.push(GMapping(segment[REV_GENERATED_LINE] + 1, segment[REV_GENERATED_COLUMN]));
        }
        return result;
    }

    exports.AnyMap = AnyMap;
    exports.GREATEST_LOWER_BOUND = GREATEST_LOWER_BOUND;
    exports.LEAST_UPPER_BOUND = LEAST_UPPER_BOUND;
    exports.TraceMap = TraceMap;

    Object.defineProperty(exports, '__esModule', { value: true });

}));


},{"@jridgewell/resolve-uri":107,"@jridgewell/sourcemap-codec":109}],111:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],112:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":111,"buffer":112,"ieee754":113}],113:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],114:[function(require,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
}

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}

},{}],115:[function(require,module,exports){
(function (Buffer){(function (){
'use strict';

const object = {};
const hasOwnProperty = object.hasOwnProperty;
const forOwn = (object, callback) => {
	for (const key in object) {
		if (hasOwnProperty.call(object, key)) {
			callback(key, object[key]);
		}
	}
};

const extend = (destination, source) => {
	if (!source) {
		return destination;
	}
	forOwn(source, (key, value) => {
		destination[key] = value;
	});
	return destination;
};

const forEach = (array, callback) => {
	const length = array.length;
	let index = -1;
	while (++index < length) {
		callback(array[index]);
	}
};

const toString = object.toString;
const isArray = Array.isArray;
const isBuffer = Buffer.isBuffer;
const isObject = (value) => {
	// This is a very simple check, but it’s good enough for what we need.
	return toString.call(value) == '[object Object]';
};
const isString = (value) => {
	return typeof value == 'string' ||
		toString.call(value) == '[object String]';
};
const isNumber = (value) => {
	return typeof value == 'number' ||
		toString.call(value) == '[object Number]';
};
const isFunction = (value) => {
	return typeof value == 'function';
};
const isMap = (value) => {
	return toString.call(value) == '[object Map]';
};
const isSet = (value) => {
	return toString.call(value) == '[object Set]';
};

/*--------------------------------------------------------------------------*/

// https://mathiasbynens.be/notes/javascript-escapes#single
const singleEscapes = {
	'"': '\\"',
	'\'': '\\\'',
	'\\': '\\\\',
	'\b': '\\b',
	'\f': '\\f',
	'\n': '\\n',
	'\r': '\\r',
	'\t': '\\t'
	// `\v` is omitted intentionally, because in IE < 9, '\v' == 'v'.
	// '\v': '\\x0B'
};
const regexSingleEscape = /["'\\\b\f\n\r\t]/;

const regexDigit = /[0-9]/;
const regexWhitelist = /[ !#-&\(-\[\]-_a-~]/;

const jsesc = (argument, options) => {
	const increaseIndentation = () => {
		oldIndent = indent;
		++options.indentLevel;
		indent = options.indent.repeat(options.indentLevel)
	};
	// Handle options
	const defaults = {
		'escapeEverything': false,
		'minimal': false,
		'isScriptContext': false,
		'quotes': 'single',
		'wrap': false,
		'es6': false,
		'json': false,
		'compact': true,
		'lowercaseHex': false,
		'numbers': 'decimal',
		'indent': '\t',
		'indentLevel': 0,
		'__inline1__': false,
		'__inline2__': false
	};
	const json = options && options.json;
	if (json) {
		defaults.quotes = 'double';
		defaults.wrap = true;
	}
	options = extend(defaults, options);
	if (
		options.quotes != 'single' &&
		options.quotes != 'double' &&
		options.quotes != 'backtick'
	) {
		options.quotes = 'single';
	}
	const quote = options.quotes == 'double' ?
		'"' :
		(options.quotes == 'backtick' ?
			'`' :
			'\''
		);
	const compact = options.compact;
	const lowercaseHex = options.lowercaseHex;
	let indent = options.indent.repeat(options.indentLevel);
	let oldIndent = '';
	const inline1 = options.__inline1__;
	const inline2 = options.__inline2__;
	const newLine = compact ? '' : '\n';
	let result;
	let isEmpty = true;
	const useBinNumbers = options.numbers == 'binary';
	const useOctNumbers = options.numbers == 'octal';
	const useDecNumbers = options.numbers == 'decimal';
	const useHexNumbers = options.numbers == 'hexadecimal';

	if (json && argument && isFunction(argument.toJSON)) {
		argument = argument.toJSON();
	}

	if (!isString(argument)) {
		if (isMap(argument)) {
			if (argument.size == 0) {
				return 'new Map()';
			}
			if (!compact) {
				options.__inline1__ = true;
				options.__inline2__ = false;
			}
			return 'new Map(' + jsesc(Array.from(argument), options) + ')';
		}
		if (isSet(argument)) {
			if (argument.size == 0) {
				return 'new Set()';
			}
			return 'new Set(' + jsesc(Array.from(argument), options) + ')';
		}
		if (isBuffer(argument)) {
			if (argument.length == 0) {
				return 'Buffer.from([])';
			}
			return 'Buffer.from(' + jsesc(Array.from(argument), options) + ')';
		}
		if (isArray(argument)) {
			result = [];
			options.wrap = true;
			if (inline1) {
				options.__inline1__ = false;
				options.__inline2__ = true;
			}
			if (!inline2) {
				increaseIndentation();
			}
			forEach(argument, (value) => {
				isEmpty = false;
				if (inline2) {
					options.__inline2__ = false;
				}
				result.push(
					(compact || inline2 ? '' : indent) +
					jsesc(value, options)
				);
			});
			if (isEmpty) {
				return '[]';
			}
			if (inline2) {
				return '[' + result.join(', ') + ']';
			}
			return '[' + newLine + result.join(',' + newLine) + newLine +
				(compact ? '' : oldIndent) + ']';
		} else if (isNumber(argument)) {
			if (json) {
				// Some number values (e.g. `Infinity`) cannot be represented in JSON.
				return JSON.stringify(argument);
			}
			if (useDecNumbers) {
				return String(argument);
			}
			if (useHexNumbers) {
				let hexadecimal = argument.toString(16);
				if (!lowercaseHex) {
					hexadecimal = hexadecimal.toUpperCase();
				}
				return '0x' + hexadecimal;
			}
			if (useBinNumbers) {
				return '0b' + argument.toString(2);
			}
			if (useOctNumbers) {
				return '0o' + argument.toString(8);
			}
		} else if (!isObject(argument)) {
			if (json) {
				// For some values (e.g. `undefined`, `function` objects),
				// `JSON.stringify(value)` returns `undefined` (which isn’t valid
				// JSON) instead of `'null'`.
				return JSON.stringify(argument) || 'null';
			}
			return String(argument);
		} else { // it’s an object
			result = [];
			options.wrap = true;
			increaseIndentation();
			forOwn(argument, (key, value) => {
				isEmpty = false;
				result.push(
					(compact ? '' : indent) +
					jsesc(key, options) + ':' +
					(compact ? '' : ' ') +
					jsesc(value, options)
				);
			});
			if (isEmpty) {
				return '{}';
			}
			return '{' + newLine + result.join(',' + newLine) + newLine +
				(compact ? '' : oldIndent) + '}';
		}
	}

	const string = argument;
	// Loop over each code unit in the string and escape it
	let index = -1;
	const length = string.length;
	result = '';
	while (++index < length) {
		const character = string.charAt(index);
		if (options.es6) {
			const first = string.charCodeAt(index);
			if ( // check if it’s the start of a surrogate pair
				first >= 0xD800 && first <= 0xDBFF && // high surrogate
				length > index + 1 // there is a next code unit
			) {
				const second = string.charCodeAt(index + 1);
				if (second >= 0xDC00 && second <= 0xDFFF) { // low surrogate
					// https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
					const codePoint = (first - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
					let hexadecimal = codePoint.toString(16);
					if (!lowercaseHex) {
						hexadecimal = hexadecimal.toUpperCase();
					}
					result += '\\u{' + hexadecimal + '}';
					++index;
					continue;
				}
			}
		}
		if (!options.escapeEverything) {
			if (regexWhitelist.test(character)) {
				// It’s a printable ASCII character that is not `"`, `'` or `\`,
				// so don’t escape it.
				result += character;
				continue;
			}
			if (character == '"') {
				result += quote == character ? '\\"' : character;
				continue;
			}
			if (character == '`') {
				result += quote == character ? '\\`' : character;
				continue;
			}
			if (character == '\'') {
				result += quote == character ? '\\\'' : character;
				continue;
			}
		}
		if (
			character == '\0' &&
			!json &&
			!regexDigit.test(string.charAt(index + 1))
		) {
			result += '\\0';
			continue;
		}
		if (regexSingleEscape.test(character)) {
			// no need for a `hasOwnProperty` check here
			result += singleEscapes[character];
			continue;
		}
		const charCode = character.charCodeAt(0);
		if (options.minimal && charCode != 0x2028 && charCode != 0x2029) {
			result += character;
			continue;
		}
		let hexadecimal = charCode.toString(16);
		if (!lowercaseHex) {
			hexadecimal = hexadecimal.toUpperCase();
		}
		const longhand = hexadecimal.length > 2 || json;
		const escaped = '\\' + (longhand ? 'u' : 'x') +
			('0000' + hexadecimal).slice(longhand ? -4 : -2);
		result += escaped;
		continue;
	}
	if (options.wrap) {
		result = quote + result + quote;
	}
	if (quote == '`') {
		result = result.replace(/\$\{/g, '\\\$\{');
	}
	if (options.isScriptContext) {
		// https://mathiasbynens.be/notes/etago
		return result
			.replace(/<\/(script|style)/gi, '<\\/$1')
			.replace(/<!--/g, json ? '\\u003C!--' : '\\x3C!--');
	}
	return result;
};

jsesc.version = '2.5.2';

module.exports = jsesc;

}).call(this)}).call(this,{"isBuffer":require("../is-buffer/index.js")})
},{"../is-buffer/index.js":114}],116:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],117:[function(require,module,exports){
'use strict';

let fastProto = null;

// Creates an object with permanently fast properties in V8. See Toon Verwaest's
// post https://medium.com/@tverwaes/setting-up-prototypes-in-v8-ec9c9491dfe2#5f62
// for more details. Use %HasFastProperties(object) and the Node.js flag
// --allow-natives-syntax to check whether an object has fast properties.
function FastObject(o) {
	// A prototype object will have "fast properties" enabled once it is checked
	// against the inline property cache of a function, e.g. fastProto.property:
	// https://github.com/v8/v8/blob/6.0.122/test/mjsunit/fast-prototype.js#L48-L63
	if (fastProto !== null && typeof fastProto.property) {
		const result = fastProto;
		fastProto = FastObject.prototype = null;
		return result;
	}
	fastProto = FastObject.prototype = o == null ? Object.create(null) : o;
	return new FastObject;
}

// Initialize the inline property cache of FastObject
FastObject();

module.exports = function toFastproperties(o) {
	return FastObject(o);
};

},{}],118:[function(require,module,exports){
(function (global){(function (){
let astGlb = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof globalThis !== 'undefined' ? globalThis : this;
astGlb.babel = astGlb.babel || {};
if (!astGlb.babel.generator) astGlb.babel.generator = require("@babel/generator").default;
}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"@babel/generator":14}]},{},[118]);
