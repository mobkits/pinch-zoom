/**
 * Get the distance between two points
 *
 * @param {Array} arr [x1, y1, x2, y2]
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
