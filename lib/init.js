var chinesestrokes = strokes;

// In memory data struct
var mousestrokes = [];
var canvas = document.getElementById('stroke_input_canvas');
var ctx = canvas.getContext("2d");

var clicking = false;
canvas.addEventListener("mousemove", function(e){
  if (clicking) {
    dragClick((e.pageX - canvas.offsetLeft), (e.pageY - canvas.offsetTop));
  }
}, false);

canvas.addEventListener("mousedown", function(e){
  startClick((e.pageX - canvas.offsetLeft), (e.pageY - canvas.offsetTop));
}, false);

canvas.addEventListener("mouseup", function(e){
  endClick((e.pageX - canvas.offsetLeft), (e.pageY - canvas.offsetTop));
}, false);

var strokeXYs ;
var lastPt;
var minx, miny, maxx, maxy;
var strokeDescriptor = [];

function startClick(x,y){
  clicking = true;
  
  strokeXYs = [];
  lastPt = {x:x,y:y};
  strokeXYs.push(lastPt);
  
  ctx.strokeStyle = "black";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x,y);
}

function dragClick(x,y){
  if ((x==lastPt.x) && (y==lastPt.y)) return;
  lastPt = {x:x,y:y};
  strokeXYs.push(lastPt);
  ctx.lineTo(x,y);
  ctx.stroke();
}

function endClick(x,y){
  clicking = false;
  ctx.lineTo(x,y);
  ctx.stroke();
  strokeXYs.push({x:x,y:y});
  mousestrokes.push(strokeXYs);
  analyze(strokeXYs);
}

function chineseword(a) { return ('\&#0'+parseInt(a,16)+';'); }

function analyze(stroke) {
  // Short straw algorithm for sub stroke detection
  // It works for simple strokes, but we should handle its substrokes more carefully (TODO)
  var corners = shortStraw(stroke);
  
  // Lets draw shortStrawPoints in RED.
  ctx.strokeStyle = "red";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(corners[0].x,corners[0].y);
  
  corners.forEach(function(corner){
    ctx.lineTo(corner.x , corner.y);
  });
  ctx.stroke();
  
  // Getting the diagonal normalizer here.
  var ymin = Number.POSITIVE_INFINITY;
  var xmin = Number.POSITIVE_INFINITY;
  var ymax = Number.NEGATIVE_INFINITY;
  var xmax = Number.NEGATIVE_INFINITY;
  
  // TODO To save processing cycles, we can incrementally add this to an variable 
  // By just running for (var i=0;i<corners.length;i++) {
  for (var i1 in mousestrokes) {
    for (var i2 in mousestrokes[i1]) {
      if (mousestrokes[i1][i2].x>xmax) xmax = mousestrokes[i1][i2].x; // or xmax = Math.max(xmax, mousestrokes[i1][i2].x);
      if (mousestrokes[i1][i2].x<xmin) xmin = mousestrokes[i1][i2].x; // or xmin = Math.min(xmin, mousestrokes[i1][i2].x);
      if (mousestrokes[i1][i2].y>ymax) ymax = mousestrokes[i1][i2].y; // or ymax = Math.max(ymax, mousestrokes[i1][i2].y);
      if (mousestrokes[i1][i2].y<ymin) ymin = mousestrokes[i1][i2].y; // or ymin = Math.min(ymin, mousestrokes[i1][i2].y);
	}
  }
  
  var w = xmax - xmin;
  var h = ymax - ymin;
  var dimensionSquared = (w>h) ? w*w : h*h;
  var normalizer = Math.pow(dimensionSquared*2, 1/2);
  
  // Convert to Gradient and Length
  for (var i=1;i<corners.length;i++) {
    var p1 = corners[i-1];
    var p2 = corners[i];
    var dy = p1.y - p2.y;
    var dx = p1.x - p2.x;
    
    //Lets get normalized length instead
    var normalized = Math.pow(dy*dy + dx*dx, 1/2) / normalizer;
    //normalized = Math.min (normalized, 1.0);
    var direction = Math.PI -  Math.atan2(dy, dx);
    strokeDescriptor.push({d:direction, l:normalized});
  }
  
  var possible = [];
  var bestmatch = '';
  var bestscore = 0;
  for (var c in chinesestrokes) {
    var cd  = chinesestrokes[c];
    var cdi = [];
    for (var i=1;i<cd.length;i++) {
      cdi.push({d:cd[i][0], l:cd[i][1]});
    }
    var score = match( strokeDescriptor, cdi);
    if (score>-1){
      possible.push({w:cd, s:score, huh:cdi});
    }
    if (score>bestscore) {
      bestmatch = cd;
      bestscore = score;
    }
  }
  possible.sort(function(a,b){
    return b.s - a.s; //.length
  });
  
  document.getElementById('suggestions').innerHTML = '';
  for (var i=0;((i<9)&&possible[i]);i++) {
    var sug = document.createElement('span');
    sug.addEventListener('click', function(e){
      document.getElementById('wordsOut').value += this.innerHTML;
    }, false);
    sug.innerHTML = chineseword(possible[i].w);
    sug.setAttribute('class', 'sugItem');
    document.getElementById('suggestions').appendChild(sug);
  }
}

function analyzeBestMatch(bestmatch) {
  cdi = [];
  var ctx2 = document.getElementById('c2').getContext("2d");
  ctx2.clearRect(0,0,800,600);
  
  for (var i=1;i<bestmatch.length;i++) {
    cdi.push({d:bestmatch[i][0], l:bestmatch[i][1]});
    var d = bestmatch[i][0];
    var o = {x:100,y:i/bestmatch.length*300};
    
    ctx2.beginPath();
    ctx2.arc(o.x, o.y, 5, 0, Math.PI*2, true);
    ctx2.closePath();
    ctx2.fill();
    ctx2.fillText(i, o.x-20, o.y-20);
    
    ctx2.beginPath();
    ctx2.moveTo(o.x, o.y);
    
    var h = bestmatch[i][1]*100;
    var d = -bestmatch[i][0];
    var x = Math.cos(d)* h;
    var y = Math.sin(d)* h;
    
    ctx2.lineTo(o.x + x, o.y + y);
    ctx2.closePath();
    ctx2.stroke();
  }
}

function match(strokeDescriptor, charDescriptor) {
  var score = 0;
  
  if (strokeDescriptor.length != charDescriptor.length) return -1;
  for (var i in strokeDescriptor) { //var i= 1; i< strokeDescriptor.length; i++
    // Lenth score
    //if (i==charDescriptor.length)return score;
    var ls = Math.abs(strokeDescriptor[i].l - charDescriptor[i].l);
    dl = (1-ls);
    
    //Direction Score
    var ds = Math.abs(strokeDescriptor[i].d - charDescriptor[i].d);
    if (ds > Math.PI) ds = 2*Math.PI - ds;
    ds = 100* ( Math.PI*2 - ds)/(Math.PI*2);
    //ds = Math.min(ds,100);
      
    score +=  ds+  dl*charDescriptor[i].l;
  }
  return score;
}

document.getElementById('stroke_clear').onclick = function(){
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  mousestrokes = [];
  strokeDescriptor = [];
  document.getElementById('suggestions').innerHTML = '';
}

function drawline(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1,y1);
  ctx.lineTo(x2,y2);
  ctx.closePath();
  ctx.stroke();
}