var events = require('events')
var event = require('event')
var Emitter = require('emitter')
var tap = require('tap-event')
var raf = require('raf')
var Tween = require('tween')
var detect = require('prop-detect')
var util = require('./util')
var Pinch = require('./pinch')
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
  if (this.animating) {
    e.stopPropagation()
    this.tween.stop()
  }
  if (!touches || 1 != touches.length) return
  var rect = this.el.getBoundingClientRect()
  this.translateY = rect.top < 0 || rect.bottom > this.container.clientHeight
  this.speed = 0
  var d = Date.now()
  var t = e.touches[0]
  var sx = t.clientX
  var sy = t.clientY
  var self = this
  var start = {x: this.tx, y: this.ty}
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
  if (this.move == null) return
  if (this.down == null) return this.move = null
  //if (this.tween) this.tween.stop()
  if (this.pinch.pinching || this.animating) return

  var t = Date.now()
  var touch = e.changedTouches[0]
  var x = touch.clientX
  var y = touch.clientY
  var sx = this.down.x
  var sy = this.down.y

  this.calcuteSpeed(x, y)
  var dx = Math.abs(x - sx)
  var limit = this.getLimitation()
  if (dx > this.fastThreshold && dx > Math.abs(y - sy) &&
    (t - this.down.at) < this.threshold && (this.tx <= limit.minx || this.tx >= limit.maxx)) {
    var dir = x > sx ? 'right' : 'left'
    this.down = this.move = null
    return this.emit('swipe', dir)
  }

  this.down = this.move = null
  this.emit('end')
  if (this.speed) this.momentum()
}

PinchZoom.prototype.momentum = function () {
  var deceleration = 0.001
  var limit = this.getLimitation(this.padding)
  var speed = Math.min(this.speed, 4)
  var rate = (4 - PI)/2
  var dis = rate * (speed * speed) / (2 * deceleration)
  var tx = this.tx + dis*Math.cos(this.angle)
  var ty = this.ty + dis*Math.sin(this.angle)
  var res = util.limit(tx, ty, limit)
  var changed = ((this.scale > 1 && (tx < limit.minx || tx > limit.maxx))
                || ty < limit.miny || ty > limit.maxy)
  var ease = changed ? outBack : 'out-circ'
  var d = util.distance([tx, ty, res.x, res.y])

  var duration = (1 - d/dis) * speed/deceleration
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
  if (this.animating) return this.tween.stop()
  var ts = Date.now()
  // double tap
  if (this.lastTap && ts - this.lastTap < 300) {
    this.emit('tap')
    return
  }
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
  if (isNaN(x) || isNaN(y)) return
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
  var pad = this.padding
  if (rect.left > pad) {
    dest.x = this.tx - rect.left + pad
  } else if (rect.left + rect.width < vw - pad) {
    dest.x = this.tx + (vw - rect.left - rect.width - pad)
  }
  var bottom = rect.top + rect.height
  if (rect.top > 0 && bottom > vh - pad) {
    // too low
    dest.y = this.ty - (bottom - vh + pad)
  } else if (rect.top < pad && bottom < vh - pad) {
    // too high
    dest.y = this.ty - rect.top + pad
  }
  if (dest.x !== this.tx || dest.y !== this.ty) {
    return this.animate(dest, 200)
  }
  return Promise.resolve()
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

function outBack(n) {
  var s = 1.20158;
  return --n * n * ((s + 1) * n + s) + 1;
}

module.exports = PinchZoom
