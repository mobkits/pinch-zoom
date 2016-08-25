/*
 * Module dependencies
 */

var events = require('events')
var Emitter = require('emitter')
var E = require('./e')
var util = require('./util')

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
