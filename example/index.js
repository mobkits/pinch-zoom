var pinchZoom = require('..')
var el = document.querySelector('.wrapper')
var pzoom = pinchZoom(el, {
  draggable: true,
  maxScale: 4
})
pzoom.on('swipe', function (dir) {
  alert(dir)
})
//pzoom.checkPosition()
//var p = pzoom.scaleAt(pzoom.sx + 100, pzoom.sy + 100, 2)
//p.then(function () {
//  var rect = pzoom.el.getBoundingClientRect()
//})
