(function(){
  var chinesestrokes = strokes;
  var canvas = document.getElementById('stroke_input');
  canvas.setAttribute('width', '600');
  canvas.setAttribute('height', '400');
  var ctx = canvas.getContext("2d");
  var clicking = false;
  
  canvas.addEventListener("mousedown", function(e){
    handleXY('start',(e.clientX - canvas.offsetLeft), (e.clientY - canvas.offsetTop));
  }, false);
  
  canvas.addEventListener("mousemove", function(e){
    if (clicking) {
      handleXY('move',(e.clientX - canvas.offsetLeft), (e.clientY - canvas.offsetTop));
    }
  }, false);
  
  canvas.addEventListener("mouseup", function(e){
    handleXY('end',(e.clientX - canvas.offsetLeft), (e.clientY - canvas.offsetTop));
  }, false);
  
  // In memory data struct
  var mousestrokes = [];
  var strokeXYs;
  var strokeDescriptor = [];

  function handleXY(res,x,y){
    if (res === 'start') {
      clicking = true;
      strokeXYs = [];
      strokeXYs.push({x:x,y:y});
      ctx.strokeStyle = "black";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x,y);
	} else if (res === 'move') {
      strokeXYs.push({x:x,y:y});
      draw(x,y);
    } else if (res === 'end'){
      clicking = false;
      strokeXYs.push({x:x,y:y});
      mousestrokes.push(strokeXYs);
      analyze(strokeXYs);
	}	  
  }
  
  function draw(x,y){
    ctx.lineTo(x,y);
    ctx.stroke();	  
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
      draw(corner.x , corner.y);
    });
    
    
    // Getting the diagonal normalizer here.    
    var ymin = Number.POSITIVE_INFINITY;
    var xmin = Number.POSITIVE_INFINITY;
    var ymax = Number.NEGATIVE_INFINITY;
    var xmax = Number.NEGATIVE_INFINITY;
    
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
      var direction = Math.PI - Math.atan2(dy, dx);
      strokeDescriptor.push({d:direction, l:normalized});
    }
    
    var possible = [];
    var bestmatch = '';
    var bestscore = 0;
    
    chinesestrokes.forEach(function(cd){
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
    });
    
    possible.sort(function(a,b){
      return b.s - a.s;
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

function match(strokeDescriptor, charDescriptor) {
  var score = 0;
  
  if (strokeDescriptor.length != charDescriptor.length) return -1;
  
  strokeDescriptor.forEach(function(e,i){
	var ls = Math.abs(e.l - charDescriptor[i].l);
    dl = (1-ls);
    
    //Direction Score
    var ds = Math.abs(e.d - charDescriptor[i].d);
    if (ds > Math.PI) ds = 2*Math.PI - ds;
    ds = 100* ( Math.PI*2 - ds)/(Math.PI*2);
    //ds = Math.min(ds,100);
      
    score +=  ds+  dl*charDescriptor[i].l;
  });
  return score;
}

document.getElementById('stroke_clear').onclick = function(){
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  mousestrokes = [];
  strokeDescriptor = [];
  document.getElementById('suggestions').innerHTML = '';
}
})();
