/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	var pinchZoom = __webpack_require__(1)
	var log = document.getElementById('log')
	var el = document.querySelector('.wrapper')
	var pzoom = pinchZoom(el, {
	  tapreset: true,
	  draggable: true,
	  maxScale: 4
	})
	pzoom.on('swipe', function (dir) {
	  console.log(dir)
	})
	pzoom.on('move', function (dx) {
	  log.textContent = dx
	})


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	var events = __webpack_require__(2)
	var event = __webpack_require__(3)
	var Emitter = __webpack_require__(8)
	var tap = __webpack_require__(9)
	var raf = __webpack_require__(10)
	var Tween = __webpack_require__(11)
	var detect = __webpack_require__(15)
	var util = __webpack_require__(21)
	var Pinch = __webpack_require__(22)
	var has3d = detect.has3d
	var transform = detect.transform
	var PI = Math.PI
	
	/**
	 * Init PinchZoom with element and optional opt
	 *
	 * @public
	 * @param  {Element}  el
	 * @param {Object} opt
	 */
	function PinchZoom(el, opt) {
	  if (!(this instanceof PinchZoom)) return new PinchZoom(el, opt)
	  opt = opt || {}
	  this.el = el
	  this.padding = opt.padding || 0
	  this.container = el.parentNode
	  this.container.style.overflow = 'hidden'
	  this.scale = 1
	  this.maxScale = opt.maxScale || 5
	  // maximun duration in ms for fast swipe
	  this.threshold = opt.threshold || 200
	  // minimum moved distance for fast swipe
	  this.fastThreshold = opt.fastThreshold || 30
	  var rect = el.getBoundingClientRect()
	  this.tapreset = opt.tapreset || false
	  this.sx = rect.left + rect.width/2
	  this.sy = rect.top + rect.height/2
	  // transform x y
	  this.tx = this.ty = 0
	  this.animating = false
	  this.pinch = new Pinch(el, this.onPinchMove.bind(this))
	  this.pinch.on('start', this.onPinchStart.bind(this))
	  this.pinch.on('end', this.onPinchEnd.bind(this))
	  if (has3d) {
	    this.el.style[transform + 'Origin'] = 'center center 0px'
	  } else {
	    this.el.style[transform + 'Origin'] = 'center center'
	  }
	  var _ontap = this._ontap = tap(this.ontap.bind(this))
	  event.bind(el, 'touchstart', _ontap)
	  this.events = events(el, this)
	  this.docEvents = events(document, this);
	  if (opt.draggable) {
	    this.events.bind('touchstart')
	    this.events.bind('touchmove')
	    this.events.bind('touchend')
	    this.docEvents.bind('touchend', 'ontouchend')
	  }
	}
	
	Emitter(PinchZoom.prototype)
	
	/**
	 * touchstart event listener for single touch
	 *
	 * @private
	 * @param  {Event}  e
	 */
	PinchZoom.prototype.ontouchstart = function (e) {
	  var touches = e.touches
	  if (!touches || 1 != touches.length) return
	  if (this.animating) this.tween.stop()
	  var rect = this.el.getBoundingClientRect()
	  this.translateY = rect.top < 0 || rect.bottom > this.container.clientHeight
	  this.speed = 0
	  var d = Date.now()
	  var t = e.touches[0]
	  var sx = t.clientX
	  var sy = t.clientY
	  var self = this
	  var start = {x: self.tx, y: self.ty}
	  var limit = this.getLimitation(100)
	  this.move = function (e, touch) {
	    self.down = {
	      x: sx,
	      y: sy,
	      at: d
	    }
	    var cx = touch.clientX
	    var cy = touch.clientY
	    var px = this.prev ? this.prev.x : sx
	    var py = this.prev ? this.prev.y : sy
	    e.preventDefault()
	    var leftOrRight = Math.abs(cx - px) > Math.abs(cy - py)
	    if (self.scale != 1 && !leftOrRight) e.stopPropagation()
	    if (this.draggable === false && self.scale == 1 && leftOrRight) {
	      return this.emit('move', px - cx)
	    }
	    self.calcuteSpeed(cx, cy)
	    var tx = start.x + cx - sx
	    var ty = start.y + cy - sy
	    var res = util.limit(tx, ty, limit)
	    var dx = res.x - tx
	    if (self.scale == 1 && leftOrRight) {
	      res.y = this.ty
	      this.angle = cx - px > 0 ? 0 : PI
	    }
	    if (leftOrRight) this.emit('move', dx)
	    if (!this.translateY) res.y = start.y
	    self.setTransform(res.x, res.y, self.scale)
	  }
	}
	
	/**
	 * touchmove event listener for single touch
	 *
	 * @private
	 * @param  {Event}  e
	 */
	PinchZoom.prototype.ontouchmove = function (e) {
	  if (!this.move || this.animating ||this.pinch.pinching) return
	  var touches = e.touches
	  if (!touches || 1 != touches.length) {
	    this.move = null
	    return
	  }
	  var touch = touches[0]
	  this.move(e, touch)
	}
	
	/**
	 * touchend event listener for single touch
	 *
	 * @private
	 * @param  {Event}  e
	 */
	PinchZoom.prototype.ontouchend = function (e) {
	  if (!this.down) return
	  var t = Date.now()
	  var touch = e.changedTouches[0]
	  var x = touch.clientX
	  var y = touch.clientY
	  var dx = Math.abs(x - this.down.x) 
	  if ( dx > this.fastThreshold && dx > Math.abs(y - this.down.y) &&
	      (t - this.down.at) < this.threshold ) {
	    var dir = x > this.down.x ? 'right' : 'left'
	    var limit = this.getLimitation()
	    if (this.scale == 1 || this.tx <= limit.minx || this.tx >= limit.maxx) {
	
	      this.emit('swipe', dir)
	    }
	  } else {
	    this.emit('end')
	  }
	  this.down = this.move = null
	  if (this.pinch.pinching) return
	  if (this.tween) this.tween.stop()
	  this.momentum()
	}
	
	PinchZoom.prototype.momentum = function () {
	  var deceleration = 0.001
	  var limit = this.getLimitation()
	  var speed = Math.min(this.speed, 2)
	  var rate = (4 - PI)/2
	  var dis = rate * (speed * speed) / (2 * deceleration)
	  var tx = this.tx + dis*Math.cos(this.angle)
	  var ty = this.ty + dis*Math.sin(this.angle)
	  var res = util.limit(tx, ty, limit)
	  var changed = this.scale > 1 && (tx < limit.minx || tx > limit.maxx
	                || ty < limit.miny || ty > limit.maxy)
	  //changed = ty < limit.miny || ty > limit.maxy ? true : changed
	  var ease = changed ? 'out-back' : 'out-circ'
	  var duration = speed/deceleration
	  if (this.ty < limit.miny || this.ty > limit.maxy) {
	    duration = 500
	    ease = 'out-circ'
	  }
	  if (!this.translateY) res.y = this.ty
	  return this.animate({x: res.x, y: res.y, scale: this.scale}, duration, ease)
	}
	
	/**
	 * get limitation values
	 *
	 * @private
	 */
	PinchZoom.prototype.getLimitation = function (padY) {
	  padY = padY || 0
	  var viewport = util.viewport
	  var vw = viewport.width
	  var vh = viewport.height
	  var rect = this.el.getBoundingClientRect()
	  var prect = this.el.parentNode.getBoundingClientRect()
	  return {
	    maxx: this.tx - rect.left + prect.left + this.padding,
	    minx: this.tx - (rect.left - prect.left + rect.width - vw) - this.padding,
	    miny: vh > rect.height ? this.ty - rect.top
	            : this.ty - rect.top - (rect.height - vh) - padY,
	    maxy: vh > rect.height ? this.ty + (vh - rect.top - rect.height)
	            : this.ty  - rect.top + padY
	    }
	}
	
	/**
	 * tap event handler
	 *
	 * @private
	 */
	PinchZoom.prototype.ontap = function () {
	  var ts = Date.now()
	  // double tap
	  if (this.lastTap && ts - this.lastTap < 300) {
	    this.emit('tap')
	    return
	  }
	  if (this.animating) return
	  if (this.scale == 1) {
	    //could be used for reset popup
	    this.emit('tap')
	    return
	  }
	  this.lastTap = Date.now()
	  if (this.tapreset) {
	    this.reset()
	  } else {
	    this.emit('tap')
	  }
	}
	
	/**
	 * Reset to initial state with animation
	 *
	 * @public
	 * @returns {Promise}
	 */
	PinchZoom.prototype.reset = function () {
	  this.emit('scale', {x: 0, y: 0, scale: 1})
	  var promise = this.animate({x: 0, y: 0, scale: 1}, 200)
	  return promise
	}
	
	/**
	 * PinchStart event handler
	 * @param {Obejct} point
	 * @private
	 */
	PinchZoom.prototype.onPinchStart = function (point) {
	  if (this.animating) this.tween.stop()
	  this.start = point
	  this.bx = this.sx + this.tx
	  this.by = this.sy + this.ty
	  this.startScale = this.scale
	  this.emit('start')
	}
	
	/**
	 * PinchMove event handler
	 * @param {Event} e
	 * @private
	 */
	PinchZoom.prototype.onPinchMove = function (e) {
	  if (this.animating) return
	  this.point = {x: e.x, y: e.y}
	  var mx = e.x - this.start.x
	  var my = e.y - this.start.y
	  // center position
	  var x = this.bx + mx
	  var y = this.by + my
	  var a = util.getAngle(x, y, e.x, e.y)
	  var dis = util.distance([e.y, e.x, y, x]) * (e.scale - 1)
	  var tx = this.bx - this.sx + mx - dis*Math.cos(a)
	  var ty = this.by - this.sy + my - dis*Math.sin(a)
	  this.setTransform(tx, ty, e.scale * this.startScale)
	}
	
	/**
	 * PinchEnd event handler
	 *
	 * @private
	 */
	PinchZoom.prototype.onPinchEnd = function () {
	  if (this.scale !== this.startScale) {
	    this.emit('scale', {x: this.tx, y: this.ty, scale: this.scale})
	  }
	  this.startScale = this.scale
	  var p = this.checkScale()
	  if (!p) this.checkPosition()
	}
	
	/**
	 * set transform properties of element
	 *
	 * @public
	 * @param {Number} x
	 * @param {Number} y
	 * @param {Number} scale
	 */
	PinchZoom.prototype.setTransform = function (x, y, scale) {
	  this.tx = x
	  this.ty = y
	  this.scale = scale
	  if (has3d) {
	    this.el.style[transform] = 'translate3d(' + x + 'px, ' + y + 'px, 0) '
	    + ' scale3d(' + scale + ',' + scale + ', 1)'
	  } else {
	    this.el.style[transform] = 'translate(' + x + 'px, ' + y + 'px) '
	    + ' scale(' + scale + ','  + scale + ')'
	  }
	}
	
	/**
	 * animate transoform properties
	 *
	 * @public
	 * @param  {Element}  o
	 * @param {Number} duration
	 * @param {String} ease
	 */
	PinchZoom.prototype.animate = function (o, duration, ease) {
	  var current = {x: this.tx, y: this.ty, scale: this.scale}
	  ease = ease || 'out-circ'
	  var self = this
	  this.animating = true
	  var tween = this.tween = Tween(current)
	    .ease(ease)
	    .to(o)
	    .duration(duration)
	
	  tween.update(function(o){
	    self.setTransform(o.x, o.y, o.scale)
	  })
	
	  var promise = new Promise(function (resolve) {
	    tween.on('end', function(){
	      animate = function(){} // eslint-disable-line
	      self.animating = false
	      resolve()
	    })
	  })
	
	  function animate() {
	    raf(animate)
	    tween.update()
	  }
	
	  animate()
	  return promise
	}
	
	/**
	 * unbind all event listeners and reset element
	 *
	 * @public
	 */
	PinchZoom.prototype.unbind = function () {
	  this.setTransform(0, 0, 1)
	  this.pinch.unbind()
	  this.events.unbind()
	  this.docEvents.unbind()
	  event.unbind(this.el, 'touchstart', this._ontap)
	}
	
	/**
	 * Reset position if invalid scale or offset.
	 *
	 * @private
	 */
	PinchZoom.prototype.checkPosition = function () {
	  var rect = this.el.getBoundingClientRect()
	  var dest = {x: this.tx, y: this.ty, scale: this.scale}
	  var viewport = util.viewport
	  var vw = viewport.width
	  var vh = viewport.height
	  if (rect.left > 0) {
	    dest.x = this.tx - rect.left
	  } else if (rect.left + rect.width < vw) {
	    dest.x = this.tx + (vw - rect.left - rect.width)
	  }
	  var bottom = rect.top + rect.height
	  if (rect.top > 0 && bottom > vh) {
	    // too low
	    dest.y = this.ty - (bottom - vh)
	  } else if (rect.top < 0 && bottom < vh) {
	    // too hegh
	    dest.y = this.ty - rect.top
	  }
	  return this.animate(dest, 200)
	}
	
	/**
	 * Reset scale if scale not valid
	 *
	 * @private
	 */
	PinchZoom.prototype.checkScale = function () {
	  if (this.scale < 1) return this.reset()
	  if (this.scale > this.maxScale) {
	    var p = this.point
	    return this.scaleAt(p.x, p.y, this.maxScale)
	  }
	}
	
	/**
	 * Limit scale to pinch point
	 * @param {Number} scale
	 * @private
	 */
	PinchZoom.prototype.limitScale = function (scale) {
	  var x = this.sx + this.tx
	  var y = this.sy + this.ty
	  var point = this.point
	  var a = Math.atan((point.y - y)/(point.x - x))
	  if ((point.y < y && point.x < x) || (point.y > y && point.x < x)) {
	    a = a + PI
	  }
	  var dis = util.distance([point.y, point.x, y, x]) * (this.scale - scale)
	  var tx = this.tx + dis*Math.cos(a)
	  var ty = this.ty + dis*Math.sin(a)
	  return this.animate({x: tx, y: ty, scale: scale}, 200)
	}
	
	/**
	 * change el to scale at x,y with specified scale
	 *
	 * @public
	 * @param {Number} x
	 * @param {Number} y
	 * @param {Number} scale
	 * @returns {Promise}
	 */
	PinchZoom.prototype.scaleAt = function (x, y, scale) {
	  var cx = this.sx + this.tx
	  var cy = this.sy + this.ty
	  var a = util.getAngle(cx, cy, x, y)
	  var dis = util.distance([y, x, cy, cx]) * (1 - scale/this.scale)
	  var tx = this.tx + dis*Math.cos(a)
	  var ty = this.ty + dis*Math.sin(a)
	  return this.animate({x: tx, y: ty, scale: scale}, 300)
	}
	
	PinchZoom.prototype.calcuteSpeed = function(x, y) {
	  var prev = this.prev || this.down
	  var ts = Date.now()
	  var dt = ts - prev.at
	  if (ts - this.down.at < 50 || dt > 50) {
	    var distance = util.distance([prev.x, prev.y, x, y])
	    this.speed = Math.abs(distance / dt)
	    this.angle = util.getAngle(prev.x, prev.y, x, y)
	  }
	  if (dt > 50) {
	    this.prev = {x: x, y: y, at: ts}
	  }
	}
	
	module.exports = PinchZoom


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	
	/**
	 * Module dependencies.
	 */
	
	try {
	  var events = __webpack_require__(3);
	} catch(err) {
	  var events = __webpack_require__(3);
	}
	
	try {
	  var delegate = __webpack_require__(4);
	} catch(err) {
	  var delegate = __webpack_require__(4);
	}
	
	/**
	 * Expose `Events`.
	 */
	
	module.exports = Events;
	
	/**
	 * Initialize an `Events` with the given
	 * `el` object which events will be bound to,
	 * and the `obj` which will receive method calls.
	 *
	 * @param {Object} el
	 * @param {Object} obj
	 * @api public
	 */
	
	function Events(el, obj) {
	  if (!(this instanceof Events)) return new Events(el, obj);
	  if (!el) throw new Error('element required');
	  if (!obj) throw new Error('object required');
	  this.el = el;
	  this.obj = obj;
	  this._events = {};
	}
	
	/**
	 * Subscription helper.
	 */
	
	Events.prototype.sub = function(event, method, cb){
	  this._events[event] = this._events[event] || {};
	  this._events[event][method] = cb;
	};
	
	/**
	 * Bind to `event` with optional `method` name.
	 * When `method` is undefined it becomes `event`
	 * with the "on" prefix.
	 *
	 * Examples:
	 *
	 *  Direct event handling:
	 *
	 *    events.bind('click') // implies "onclick"
	 *    events.bind('click', 'remove')
	 *    events.bind('click', 'sort', 'asc')
	 *
	 *  Delegated event handling:
	 *
	 *    events.bind('click li > a')
	 *    events.bind('click li > a', 'remove')
	 *    events.bind('click a.sort-ascending', 'sort', 'asc')
	 *    events.bind('click a.sort-descending', 'sort', 'desc')
	 *
	 * @param {String} event
	 * @param {String|function} [method]
	 * @return {Function} callback
	 * @api public
	 */
	
	Events.prototype.bind = function(event, method){
	  var e = parse(event);
	  var el = this.el;
	  var obj = this.obj;
	  var name = e.name;
	  var method = method || 'on' + name;
	  var args = [].slice.call(arguments, 2);
	
	  // callback
	  function cb(){
	    var a = [].slice.call(arguments).concat(args);
	    obj[method].apply(obj, a);
	  }
	
	  // bind
	  if (e.selector) {
	    cb = delegate.bind(el, e.selector, name, cb);
	  } else {
	    events.bind(el, name, cb);
	  }
	
	  // subscription for unbinding
	  this.sub(name, method, cb);
	
	  return cb;
	};
	
	/**
	 * Unbind a single binding, all bindings for `event`,
	 * or all bindings within the manager.
	 *
	 * Examples:
	 *
	 *  Unbind direct handlers:
	 *
	 *     events.unbind('click', 'remove')
	 *     events.unbind('click')
	 *     events.unbind()
	 *
	 * Unbind delegate handlers:
	 *
	 *     events.unbind('click', 'remove')
	 *     events.unbind('click')
	 *     events.unbind()
	 *
	 * @param {String|Function} [event]
	 * @param {String|Function} [method]
	 * @api public
	 */
	
	Events.prototype.unbind = function(event, method){
	  if (0 == arguments.length) return this.unbindAll();
	  if (1 == arguments.length) return this.unbindAllOf(event);
	
	  // no bindings for this event
	  var bindings = this._events[event];
	  if (!bindings) return;
	
	  // no bindings for this method
	  var cb = bindings[method];
	  if (!cb) return;
	
	  events.unbind(this.el, event, cb);
	};
	
	/**
	 * Unbind all events.
	 *
	 * @api private
	 */
	
	Events.prototype.unbindAll = function(){
	  for (var event in this._events) {
	    this.unbindAllOf(event);
	  }
	};
	
	/**
	 * Unbind all events for `event`.
	 *
	 * @param {String} event
	 * @api private
	 */
	
	Events.prototype.unbindAllOf = function(event){
	  var bindings = this._events[event];
	  if (!bindings) return;
	
	  for (var method in bindings) {
	    this.unbind(event, method);
	  }
	};
	
	/**
	 * Parse `event`.
	 *
	 * @param {String} event
	 * @return {Object}
	 * @api private
	 */
	
	function parse(event) {
	  var parts = event.split(/ +/);
	  return {
	    name: parts.shift(),
	    selector: parts.join(' ')
	  }
	}


/***/ },
/* 3 */
/***/ function(module, exports) {

	var bind = window.addEventListener ? 'addEventListener' : 'attachEvent',
	    unbind = window.removeEventListener ? 'removeEventListener' : 'detachEvent',
	    prefix = bind !== 'addEventListener' ? 'on' : '';
	
	/**
	 * Bind `el` event `type` to `fn`.
	 *
	 * @param {Element} el
	 * @param {String} type
	 * @param {Function} fn
	 * @param {Boolean} capture
	 * @return {Function}
	 * @api public
	 */
	
	exports.bind = function(el, type, fn, capture){
	  el[bind](prefix + type, fn, capture || false);
	  return fn;
	};
	
	/**
	 * Unbind `el` event `type`'s callback `fn`.
	 *
	 * @param {Element} el
	 * @param {String} type
	 * @param {Function} fn
	 * @param {Boolean} capture
	 * @return {Function}
	 * @api public
	 */
	
	exports.unbind = function(el, type, fn, capture){
	  el[unbind](prefix + type, fn, capture || false);
	  return fn;
	};

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Module dependencies.
	 */
	
	try {
	  var closest = __webpack_require__(5);
	} catch(err) {
	  var closest = __webpack_require__(5);
	}
	
	try {
	  var event = __webpack_require__(3);
	} catch(err) {
	  var event = __webpack_require__(3);
	}
	
	/**
	 * Delegate event `type` to `selector`
	 * and invoke `fn(e)`. A callback function
	 * is returned which may be passed to `.unbind()`.
	 *
	 * @param {Element} el
	 * @param {String} selector
	 * @param {String} type
	 * @param {Function} fn
	 * @param {Boolean} capture
	 * @return {Function}
	 * @api public
	 */
	
	exports.bind = function(el, selector, type, fn, capture){
	  return event.bind(el, type, function(e){
	    var target = e.target || e.srcElement;
	    e.delegateTarget = closest(target, selector, true, el);
	    if (e.delegateTarget) fn.call(el, e);
	  }, capture);
	};
	
	/**
	 * Unbind event `type`'s callback `fn`.
	 *
	 * @param {Element} el
	 * @param {String} type
	 * @param {Function} fn
	 * @param {Boolean} capture
	 * @api public
	 */
	
	exports.unbind = function(el, type, fn, capture){
	  event.unbind(el, type, fn, capture);
	};


/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Module Dependencies
	 */
	
	try {
	  var matches = __webpack_require__(6)
	} catch (err) {
	  var matches = __webpack_require__(6)
	}
	
	/**
	 * Export `closest`
	 */
	
	module.exports = closest
	
	/**
	 * Closest
	 *
	 * @param {Element} el
	 * @param {String} selector
	 * @param {Element} scope (optional)
	 */
	
	function closest (el, selector, scope) {
	  scope = scope || document.documentElement;
	
	  // walk up the dom
	  while (el && el !== scope) {
	    if (matches(el, selector)) return el;
	    el = el.parentNode;
	  }
	
	  // check scope for match
	  return matches(el, selector) ? el : null;
	}


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Module dependencies.
	 */
	
	try {
	  var query = __webpack_require__(7);
	} catch (err) {
	  var query = __webpack_require__(7);
	}
	
	/**
	 * Element prototype.
	 */
	
	var proto = Element.prototype;
	
	/**
	 * Vendor function.
	 */
	
	var vendor = proto.matches
	  || proto.webkitMatchesSelector
	  || proto.mozMatchesSelector
	  || proto.msMatchesSelector
	  || proto.oMatchesSelector;
	
	/**
	 * Expose `match()`.
	 */
	
	module.exports = match;
	
	/**
	 * Match `el` to `selector`.
	 *
	 * @param {Element} el
	 * @param {String} selector
	 * @return {Boolean}
	 * @api public
	 */
	
	function match(el, selector) {
	  if (!el || el.nodeType !== 1) return false;
	  if (vendor) return vendor.call(el, selector);
	  var nodes = query.all(selector, el.parentNode);
	  for (var i = 0; i < nodes.length; ++i) {
	    if (nodes[i] == el) return true;
	  }
	  return false;
	}


/***/ },
/* 7 */
/***/ function(module, exports) {

	function one(selector, el) {
	  return el.querySelector(selector);
	}
	
	exports = module.exports = function(selector, el){
	  el = el || document;
	  return one(selector, el);
	};
	
	exports.all = function(selector, el){
	  el = el || document;
	  return el.querySelectorAll(selector);
	};
	
	exports.engine = function(obj){
	  if (!obj.one) throw new Error('.one callback required');
	  if (!obj.all) throw new Error('.all callback required');
	  one = obj.one;
	  exports.all = obj.all;
	  return exports;
	};


/***/ },
/* 8 */
/***/ function(module, exports) {

	
	/**
	 * Expose `Emitter`.
	 */
	
	module.exports = Emitter;
	
	/**
	 * Initialize a new `Emitter`.
	 *
	 * @api public
	 */
	
	function Emitter(obj) {
	  if (obj) return mixin(obj);
	};
	
	/**
	 * Mixin the emitter properties.
	 *
	 * @param {Object} obj
	 * @return {Object}
	 * @api private
	 */
	
	function mixin(obj) {
	  for (var key in Emitter.prototype) {
	    obj[key] = Emitter.prototype[key];
	  }
	  return obj;
	}
	
	/**
	 * Listen on the given `event` with `fn`.
	 *
	 * @param {String} event
	 * @param {Function} fn
	 * @return {Emitter}
	 * @api public
	 */
	
	Emitter.prototype.on =
	Emitter.prototype.addEventListener = function(event, fn){
	  this._callbacks = this._callbacks || {};
	  (this._callbacks['$' + event] = this._callbacks['$' + event] || [])
	    .push(fn);
	  return this;
	};
	
	/**
	 * Adds an `event` listener that will be invoked a single
	 * time then automatically removed.
	 *
	 * @param {String} event
	 * @param {Function} fn
	 * @return {Emitter}
	 * @api public
	 */
	
	Emitter.prototype.once = function(event, fn){
	  function on() {
	    this.off(event, on);
	    fn.apply(this, arguments);
	  }
	
	  on.fn = fn;
	  this.on(event, on);
	  return this;
	};
	
	/**
	 * Remove the given callback for `event` or all
	 * registered callbacks.
	 *
	 * @param {String} event
	 * @param {Function} fn
	 * @return {Emitter}
	 * @api public
	 */
	
	Emitter.prototype.off =
	Emitter.prototype.removeListener =
	Emitter.prototype.removeAllListeners =
	Emitter.prototype.removeEventListener = function(event, fn){
	  this._callbacks = this._callbacks || {};
	
	  // all
	  if (0 == arguments.length) {
	    this._callbacks = {};
	    return this;
	  }
	
	  // specific event
	  var callbacks = this._callbacks['$' + event];
	  if (!callbacks) return this;
	
	  // remove all handlers
	  if (1 == arguments.length) {
	    delete this._callbacks['$' + event];
	    return this;
	  }
	
	  // remove specific handler
	  var cb;
	  for (var i = 0; i < callbacks.length; i++) {
	    cb = callbacks[i];
	    if (cb === fn || cb.fn === fn) {
	      callbacks.splice(i, 1);
	      break;
	    }
	  }
	  return this;
	};
	
	/**
	 * Emit `event` with the given args.
	 *
	 * @param {String} event
	 * @param {Mixed} ...
	 * @return {Emitter}
	 */
	
	Emitter.prototype.emit = function(event){
	  this._callbacks = this._callbacks || {};
	  var args = [].slice.call(arguments, 1)
	    , callbacks = this._callbacks['$' + event];
	
	  if (callbacks) {
	    callbacks = callbacks.slice(0);
	    for (var i = 0, len = callbacks.length; i < len; ++i) {
	      callbacks[i].apply(this, args);
	    }
	  }
	
	  return this;
	};
	
	/**
	 * Return array of callbacks for `event`.
	 *
	 * @param {String} event
	 * @return {Array}
	 * @api public
	 */
	
	Emitter.prototype.listeners = function(event){
	  this._callbacks = this._callbacks || {};
	  return this._callbacks['$' + event] || [];
	};
	
	/**
	 * Check if this emitter has `event` handlers.
	 *
	 * @param {String} event
	 * @return {Boolean}
	 * @api public
	 */
	
	Emitter.prototype.hasListeners = function(event){
	  return !! this.listeners(event).length;
	};


/***/ },
/* 9 */
/***/ function(module, exports) {

	var endEvents = [
	  'touchend'
	]
	
	module.exports = Tap
	
	// default tap timeout in ms
	Tap.timeout = 200
	
	function Tap(callback, options) {
	  options = options || {}
	  // if the user holds his/her finger down for more than 200ms,
	  // then it's not really considered a tap.
	  // however, you can make this configurable.
	  var timeout = options.timeout || Tap.timeout
	
	  // to keep track of the original listener
	  listener.handler = callback
	
	  return listener
	
	  // el.addEventListener('touchstart', listener)
	  function listener(e1) {
	    // tap should only happen with a single finger
	    if (!e1.touches || e1.touches.length > 1) return
	
	    var el = e1.target
	    var context = this
	    var args = arguments;
	
	    var timeout_id = setTimeout(cleanup, timeout)
	
	    el.addEventListener('touchmove', cleanup)
	
	    endEvents.forEach(function (event) {
	      el.addEventListener(event, done)
	    })
	
	    function done(e2) {
	      // since touchstart is added on the same tick
	      // and because of bubbling,
	      // it'll execute this on the same touchstart.
	      // this filters out the same touchstart event.
	      if (e1 === e2) return
	
	      cleanup()
	
	      // already handled
	      if (e2.defaultPrevented) return
	
	      // overwrite these functions so that they all to both start and events.
	      var preventDefault = e1.preventDefault
	      var stopPropagation = e1.stopPropagation
	
	      e1.stopPropagation = function () {
	        stopPropagation.call(e1)
	        stopPropagation.call(e2)
	      }
	
	      e1.preventDefault = function () {
	        preventDefault.call(e1)
	        preventDefault.call(e2)
	      }
	
	      // calls the handler with the `end` event,
	      // but i don't think it matters.
	      callback.apply(context, args)
	    }
	
	    // cleanup end events
	    // to cancel the tap, just run this early
	    function cleanup(e2) {
	      // if it's the same event as the origin,
	      // then don't actually cleanup.
	      // hit issues with this - don't remember
	      if (e1 === e2) return
	
	      clearTimeout(timeout_id)
	
	      el.removeEventListener('touchmove', cleanup)
	
	      endEvents.forEach(function (event) {
	        el.removeEventListener(event, done)
	      })
	    }
	  }
	}


/***/ },
/* 10 */
/***/ function(module, exports) {

	/**
	 * Expose `requestAnimationFrame()`.
	 */
	
	exports = module.exports = window.requestAnimationFrame
	  || window.webkitRequestAnimationFrame
	  || window.mozRequestAnimationFrame
	  || fallback;
	
	/**
	 * Fallback implementation.
	 */
	
	var prev = new Date().getTime();
	function fallback(fn) {
	  var curr = new Date().getTime();
	  var ms = Math.max(0, 16 - (curr - prev));
	  var req = setTimeout(fn, ms);
	  prev = curr;
	  return req;
	}
	
	/**
	 * Cancel.
	 */
	
	var cancel = window.cancelAnimationFrame
	  || window.webkitCancelAnimationFrame
	  || window.mozCancelAnimationFrame
	  || window.clearTimeout;
	
	exports.cancel = function(id){
	  cancel.call(window, id);
	};


/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	
	/**
	 * Module dependencies.
	 */
	
	var Emitter = __webpack_require__(8);
	var clone = __webpack_require__(12);
	var type = __webpack_require__(13);
	var ease = __webpack_require__(14);
	
	/**
	 * Expose `Tween`.
	 */
	
	module.exports = Tween;
	
	/**
	 * Initialize a new `Tween` with `obj`.
	 *
	 * @param {Object|Array} obj
	 * @api public
	 */
	
	function Tween(obj) {
	  if (!(this instanceof Tween)) return new Tween(obj);
	  this._from = obj;
	  this.ease('linear');
	  this.duration(500);
	}
	
	/**
	 * Mixin emitter.
	 */
	
	Emitter(Tween.prototype);
	
	/**
	 * Reset the tween.
	 *
	 * @api public
	 */
	
	Tween.prototype.reset = function(){
	  this.isArray = 'array' === type(this._from);
	  this._curr = clone(this._from);
	  this._done = false;
	  this._start = Date.now();
	  return this;
	};
	
	/**
	 * Tween to `obj` and reset internal state.
	 *
	 *    tween.to({ x: 50, y: 100 })
	 *
	 * @param {Object|Array} obj
	 * @return {Tween} self
	 * @api public
	 */
	
	Tween.prototype.to = function(obj){
	  this.reset();
	  this._to = obj;
	  return this;
	};
	
	/**
	 * Set duration to `ms` [500].
	 *
	 * @param {Number} ms
	 * @return {Tween} self
	 * @api public
	 */
	
	Tween.prototype.duration = function(ms){
	  this._duration = ms;
	  return this;
	};
	
	/**
	 * Set easing function to `fn`.
	 *
	 *    tween.ease('in-out-sine')
	 *
	 * @param {String|Function} fn
	 * @return {Tween}
	 * @api public
	 */
	
	Tween.prototype.ease = function(fn){
	  fn = 'function' == typeof fn ? fn : ease[fn];
	  if (!fn) throw new TypeError('invalid easing function');
	  this._ease = fn;
	  return this;
	};
	
	/**
	 * Stop the tween and immediately emit "stop" and "end".
	 *
	 * @return {Tween}
	 * @api public
	 */
	
	Tween.prototype.stop = function(){
	  this.stopped = true;
	  this._done = true;
	  this.emit('stop');
	  this.emit('end');
	  return this;
	};
	
	/**
	 * Perform a step.
	 *
	 * @return {Tween} self
	 * @api private
	 */
	
	Tween.prototype.step = function(){
	  if (this._done) return;
	
	  // duration
	  var duration = this._duration;
	  var now = Date.now();
	  var delta = now - this._start;
	  var done = delta >= duration;
	
	  // complete
	  if (done) {
	    this._from = this._to;
	    this._update(this._to);
	    this._done = true;
	    this.emit('end');
	    return this;
	  }
	
	  // tween
	  var from = this._from;
	  var to = this._to;
	  var curr = this._curr;
	  var fn = this._ease;
	  var p = (now - this._start) / duration;
	  var n = fn(p);
	
	  // array
	  if (this.isArray) {
	    for (var i = 0; i < from.length; ++i) {
	      curr[i] = from[i] + (to[i] - from[i]) * n;
	    }
	
	    this._update(curr);
	    return this;
	  }
	
	  // objech
	  for (var k in from) {
	    curr[k] = from[k] + (to[k] - from[k]) * n;
	  }
	
	  this._update(curr);
	  return this;
	};
	
	/**
	 * Set update function to `fn` or
	 * when no argument is given this performs
	 * a "step".
	 *
	 * @param {Function} fn
	 * @return {Tween} self
	 * @api public
	 */
	
	Tween.prototype.update = function(fn){
	  if (0 == arguments.length) return this.step();
	  this._update = fn;
	  return this;
	};

/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Module dependencies.
	 */
	
	var type;
	try {
	  type = __webpack_require__(13);
	} catch (_) {
	  type = __webpack_require__(13);
	}
	
	/**
	 * Module exports.
	 */
	
	module.exports = clone;
	
	/**
	 * Clones objects.
	 *
	 * @param {Mixed} any object
	 * @api public
	 */
	
	function clone(obj){
	  switch (type(obj)) {
	    case 'object':
	      var copy = {};
	      for (var key in obj) {
	        if (obj.hasOwnProperty(key)) {
	          copy[key] = clone(obj[key]);
	        }
	      }
	      return copy;
	
	    case 'array':
	      var copy = new Array(obj.length);
	      for (var i = 0, l = obj.length; i < l; i++) {
	        copy[i] = clone(obj[i]);
	      }
	      return copy;
	
	    case 'regexp':
	      // from millermedeiros/amd-utils - MIT
	      var flags = '';
	      flags += obj.multiline ? 'm' : '';
	      flags += obj.global ? 'g' : '';
	      flags += obj.ignoreCase ? 'i' : '';
	      return new RegExp(obj.source, flags);
	
	    case 'date':
	      return new Date(obj.getTime());
	
	    default: // string, number, boolean, …
	      return obj;
	  }
	}


/***/ },
/* 13 */
/***/ function(module, exports) {

	/**
	 * toString ref.
	 */
	
	var toString = Object.prototype.toString;
	
	/**
	 * Return the type of `val`.
	 *
	 * @param {Mixed} val
	 * @return {String}
	 * @api public
	 */
	
	module.exports = function(val){
	  switch (toString.call(val)) {
	    case '[object Date]': return 'date';
	    case '[object RegExp]': return 'regexp';
	    case '[object Arguments]': return 'arguments';
	    case '[object Array]': return 'array';
	    case '[object Error]': return 'error';
	  }
	
	  if (val === null) return 'null';
	  if (val === undefined) return 'undefined';
	  if (val !== val) return 'nan';
	  if (val && val.nodeType === 1) return 'element';
	
	  val = val.valueOf
	    ? val.valueOf()
	    : Object.prototype.valueOf.apply(val)
	
	  return typeof val;
	};


/***/ },
/* 14 */
/***/ function(module, exports) {

	
	// easing functions from "Tween.js"
	
	exports.linear = function(n){
	  return n;
	};
	
	exports.inQuad = function(n){
	  return n * n;
	};
	
	exports.outQuad = function(n){
	  return n * (2 - n);
	};
	
	exports.inOutQuad = function(n){
	  n *= 2;
	  if (n < 1) return 0.5 * n * n;
	  return - 0.5 * (--n * (n - 2) - 1);
	};
	
	exports.inCube = function(n){
	  return n * n * n;
	};
	
	exports.outCube = function(n){
	  return --n * n * n + 1;
	};
	
	exports.inOutCube = function(n){
	  n *= 2;
	  if (n < 1) return 0.5 * n * n * n;
	  return 0.5 * ((n -= 2 ) * n * n + 2);
	};
	
	exports.inQuart = function(n){
	  return n * n * n * n;
	};
	
	exports.outQuart = function(n){
	  return 1 - (--n * n * n * n);
	};
	
	exports.inOutQuart = function(n){
	  n *= 2;
	  if (n < 1) return 0.5 * n * n * n * n;
	  return -0.5 * ((n -= 2) * n * n * n - 2);
	};
	
	exports.inQuint = function(n){
	  return n * n * n * n * n;
	}
	
	exports.outQuint = function(n){
	  return --n * n * n * n * n + 1;
	}
	
	exports.inOutQuint = function(n){
	  n *= 2;
	  if (n < 1) return 0.5 * n * n * n * n * n;
	  return 0.5 * ((n -= 2) * n * n * n * n + 2);
	};
	
	exports.inSine = function(n){
	  return 1 - Math.cos(n * Math.PI / 2 );
	};
	
	exports.outSine = function(n){
	  return Math.sin(n * Math.PI / 2);
	};
	
	exports.inOutSine = function(n){
	  return .5 * (1 - Math.cos(Math.PI * n));
	};
	
	exports.inExpo = function(n){
	  return 0 == n ? 0 : Math.pow(1024, n - 1);
	};
	
	exports.outExpo = function(n){
	  return 1 == n ? n : 1 - Math.pow(2, -10 * n);
	};
	
	exports.inOutExpo = function(n){
	  if (0 == n) return 0;
	  if (1 == n) return 1;
	  if ((n *= 2) < 1) return .5 * Math.pow(1024, n - 1);
	  return .5 * (-Math.pow(2, -10 * (n - 1)) + 2);
	};
	
	exports.inCirc = function(n){
	  return 1 - Math.sqrt(1 - n * n);
	};
	
	exports.outCirc = function(n){
	  return Math.sqrt(1 - (--n * n));
	};
	
	exports.inOutCirc = function(n){
	  n *= 2
	  if (n < 1) return -0.5 * (Math.sqrt(1 - n * n) - 1);
	  return 0.5 * (Math.sqrt(1 - (n -= 2) * n) + 1);
	};
	
	exports.inBack = function(n){
	  var s = 1.70158;
	  return n * n * (( s + 1 ) * n - s);
	};
	
	exports.outBack = function(n){
	  var s = 1.70158;
	  return --n * n * ((s + 1) * n + s) + 1;
	};
	
	exports.inOutBack = function(n){
	  var s = 1.70158 * 1.525;
	  if ( ( n *= 2 ) < 1 ) return 0.5 * ( n * n * ( ( s + 1 ) * n - s ) );
	  return 0.5 * ( ( n -= 2 ) * n * ( ( s + 1 ) * n + s ) + 2 );
	};
	
	exports.inBounce = function(n){
	  return 1 - exports.outBounce(1 - n);
	};
	
	exports.outBounce = function(n){
	  if ( n < ( 1 / 2.75 ) ) {
	    return 7.5625 * n * n;
	  } else if ( n < ( 2 / 2.75 ) ) {
	    return 7.5625 * ( n -= ( 1.5 / 2.75 ) ) * n + 0.75;
	  } else if ( n < ( 2.5 / 2.75 ) ) {
	    return 7.5625 * ( n -= ( 2.25 / 2.75 ) ) * n + 0.9375;
	  } else {
	    return 7.5625 * ( n -= ( 2.625 / 2.75 ) ) * n + 0.984375;
	  }
	};
	
	exports.inOutBounce = function(n){
	  if (n < .5) return exports.inBounce(n * 2) * .5;
	  return exports.outBounce(n * 2 - 1) * .5 + .5;
	};
	
	// aliases
	
	exports['in-quad'] = exports.inQuad;
	exports['out-quad'] = exports.outQuad;
	exports['in-out-quad'] = exports.inOutQuad;
	exports['in-cube'] = exports.inCube;
	exports['out-cube'] = exports.outCube;
	exports['in-out-cube'] = exports.inOutCube;
	exports['in-quart'] = exports.inQuart;
	exports['out-quart'] = exports.outQuart;
	exports['in-out-quart'] = exports.inOutQuart;
	exports['in-quint'] = exports.inQuint;
	exports['out-quint'] = exports.outQuint;
	exports['in-out-quint'] = exports.inOutQuint;
	exports['in-sine'] = exports.inSine;
	exports['out-sine'] = exports.outSine;
	exports['in-out-sine'] = exports.inOutSine;
	exports['in-expo'] = exports.inExpo;
	exports['out-expo'] = exports.outExpo;
	exports['in-out-expo'] = exports.inOutExpo;
	exports['in-circ'] = exports.inCirc;
	exports['out-circ'] = exports.outCirc;
	exports['in-out-circ'] = exports.inOutCirc;
	exports['in-back'] = exports.inBack;
	exports['out-back'] = exports.outBack;
	exports['in-out-back'] = exports.inOutBack;
	exports['in-bounce'] = exports.inBounce;
	exports['out-bounce'] = exports.outBounce;
	exports['in-out-bounce'] = exports.inOutBounce;


/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

	exports.transition = __webpack_require__(16)
	
	exports.transform = __webpack_require__(17)
	
	exports.touchAction = __webpack_require__(18)
	
	exports.transitionend = __webpack_require__(19)
	
	exports.has3d = __webpack_require__(20)


/***/ },
/* 16 */
/***/ function(module, exports) {

	var styles = [
	  'webkitTransition',
	  'MozTransition',
	  'OTransition',
	  'msTransition',
	  'transition'
	]
	
	var el = document.createElement('p')
	var style
	
	for (var i = 0; i < styles.length; i++) {
	  if (null != el.style[styles[i]]) {
	    style = styles[i]
	    break
	  }
	}
	el = null
	
	module.exports = style


/***/ },
/* 17 */
/***/ function(module, exports) {

	
	var styles = [
	  'webkitTransform',
	  'MozTransform',
	  'msTransform',
	  'OTransform',
	  'transform'
	];
	
	var el = document.createElement('p');
	var style;
	
	for (var i = 0; i < styles.length; i++) {
	  style = styles[i];
	  if (null != el.style[style]) {
	    module.exports = style;
	    break;
	  }
	}


/***/ },
/* 18 */
/***/ function(module, exports) {

	
	/**
	 * Module exports.
	 */
	
	module.exports = touchActionProperty();
	
	/**
	 * Returns "touchAction", "msTouchAction", or null.
	 */
	
	function touchActionProperty(doc) {
	  if (!doc) doc = document;
	  var div = doc.createElement('div');
	  var prop = null;
	  if ('touchAction' in div.style) prop = 'touchAction';
	  else if ('msTouchAction' in div.style) prop = 'msTouchAction';
	  div = null;
	  return prop;
	}


/***/ },
/* 19 */
/***/ function(module, exports) {

	/**
	 * Transition-end mapping
	 */
	
	var map = {
	  'WebkitTransition' : 'webkitTransitionEnd',
	  'MozTransition' : 'transitionend',
	  'OTransition' : 'oTransitionEnd',
	  'msTransition' : 'MSTransitionEnd',
	  'transition' : 'transitionend'
	};
	
	/**
	 * Expose `transitionend`
	 */
	
	var el = document.createElement('p');
	
	for (var transition in map) {
	  if (null != el.style[transition]) {
	    module.exports = map[transition];
	    break;
	  }
	}


/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	
	var prop = __webpack_require__(17);
	
	// IE <=8 doesn't have `getComputedStyle`
	if (!prop || !window.getComputedStyle) {
	  module.exports = false;
	
	} else {
	  var map = {
	    webkitTransform: '-webkit-transform',
	    OTransform: '-o-transform',
	    msTransform: '-ms-transform',
	    MozTransform: '-moz-transform',
	    transform: 'transform'
	  };
	
	  // from: https://gist.github.com/lorenzopolidori/3794226
	  var el = document.createElement('div');
	  el.style[prop] = 'translate3d(1px,1px,1px)';
	  document.body.insertBefore(el, null);
	  var val = getComputedStyle(el).getPropertyValue(map[prop]);
	  document.body.removeChild(el);
	  module.exports = null != val && val.length && 'none' != val;
	}


/***/ },
/* 21 */
/***/ function(module, exports) {

	/**
	 * Get the distance between two points
	 *
	 * @param {Array} arr
	 * @return {Number}
	 * @api private
	 */
	
	exports.distance = function (arr) {
	  var x = Math.pow(arr[0] - arr[2], 2);
	  var y = Math.pow(arr[1] - arr[3], 2);
	  return Math.sqrt(x + y);
	}
	
	/**
	 * Get the midpoint
	 *
	 * @param {Array} arr
	 * @return {Object} coords
	 * @api private
	 */
	
	exports.midpoint = function (arr) {
	  var coords = {};
	  coords.x = (arr[0] + arr[2]) / 2;
	  coords.y = (arr[1] + arr[3]) / 2;
	  return coords;
	}
	
	Object.defineProperty(exports, 'viewport', {
	  get: function () {
	    return {
	      height: Math.max(document.documentElement.clientHeight, window.innerHeight || 0),
	      width: Math.max(document.documentElement.clientWidth, window.innerWidth || 0)
	    }
	  }
	})
	
	/**
	 * getAngle
	 *
	 * @public
	 * @param {Number} x
	 * @param {Number} y
	 * @param {Number} x1
	 * @param {Number} y1
	 * @returns {undefined}
	 */
	exports.getAngle = function (x, y, x1, y1) {
	  if (x == x1 && y == y1) return 0
	  var a = Math.atan((y1 - y)/(x1 - x))
	  if (x1 < x) return a + Math.PI
	  return a
	}
	
	exports.limit = function (x, y, limit) {
	  if (x < limit.minx) {
	    x = limit.minx
	  } else if (x > limit.maxx) {
	    x = limit.maxx
	  }
	  if (y < limit.miny) {
	    y = limit.miny
	  } else if (y > limit.maxy) {
	    y = limit.maxy
	  }
	  return {
	    x: x,
	    y: y
	  }
	}


/***/ },
/* 22 */
/***/ function(module, exports, __webpack_require__) {

	/*
	 * Module dependencies
	 */
	
	var events = __webpack_require__(2)
	var Emitter = __webpack_require__(8)
	var E = __webpack_require__(23)
	var util = __webpack_require__(21)
	
	/**
	 * Export `Pinch`
	 */
	
	module.exports = Pinch
	
	/**
	 * Initialize `Pinch`
	 *
	 * @param {Element} el
	 * @param {Function} fn
	 * @return {Pinch}
	 * @api public
	 */
	
	function Pinch(el, fn) {
	  if (!(this instanceof Pinch)) return new Pinch(el, fn)
	  this.el = el
	  this.parent = el.parentNode
	  this.fn = fn || function(){}
	  this.midpoint = null
	  this.scale = 1
	  this.lastScale = 1
	  this.pinching = false
	  this.events = events(el, this)
	  this.events.bind('touchstart')
	  this.events.bind('touchmove')
	  this.events.bind('touchend')
	  this.fingers = {}
	}
	
	Emitter(Pinch.prototype)
	
	/**
	 * Touch start
	 *
	 * @param {Event} e
	 * @return {Pinch}
	 * @api private
	 */
	
	Pinch.prototype.ontouchstart = function(e) {
	  var touches = e.touches
	  if (!touches || 2 != touches.length) return this
	  e.preventDefault()
	  e.stopPropagation()
	
	  var coords = []
	  for(var i = 0, finger; i < touches.length; i++) {
	    finger = touches[i]
	    coords.push(finger.clientX, finger.clientY)
	  }
	
	  this.pinching = true
	  this.distance = util.distance(coords)
	  this.midpoint = util.midpoint(coords)
	  this.emit('start', this.midpoint)
	  return this
	}
	
	/**
	 * Touch move
	 *
	 * @param {Event} e
	 * @return {Pinch}
	 * @api private
	 */
	
	Pinch.prototype.ontouchmove = function(e) {
	  var touches = e.touches
	  if (!touches || touches.length != 2 || !this.pinching) return this
	  e.preventDefault()
	  e.stopPropagation()
	  var coords = []
	  for(var i = 0, finger; i < touches.length ; i++) {
	    finger = touches[i]
	    coords.push(finger.clientX, finger.clientY)
	  }
	
	  var dist = util.distance(coords)
	  var mid = util.midpoint(coords)
	
	  // make event properties mutable
	  e = E(e)
	
	  // iphone does scale natively, just use that
	  e.scale = dist / this.distance * this.scale
	  e.x = mid.x
	  e.y = mid.y
	
	  this.fn(e)
	
	  this.lastScale = e.scale
	  return this
	}
	
	/**
	 * Touchend
	 *
	 * @param {Event} e
	 * @return {Pinch}
	 * @api private
	 */
	
	Pinch.prototype.ontouchend = function(e) {
	  var touches = e.touches
	  if (!touches || touches.length == 2 || !this.pinching) return this
	  this.scale = this.lastScale
	  this.pinching = false
	  this.emit('end')
	  return this
	}
	
	/**
	 * Unbind
	 *
	 * @return {Pinch}
	 * @api public
	 */
	
	Pinch.prototype.unbind = function() {
	  this.events.unbind()
	  return this
	}


/***/ },
/* 23 */
/***/ function(module, exports) {

	/**
	 * Expose `E`
	 */
	
	module.exports = function(e) {
	  // any property it doesn't find on the object
	  // itself, look up prototype for original `e`
	  E.prototype = e;
	  return new E();
	};
	
	/**
	 * Initialize `E`
	 */
	
	function E() {}


/***/ }
/******/ ]);
//# sourceMappingURL=bundle.js.map