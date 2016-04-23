/**
 *
 * @author:  Edward Angel
 * Modified by Marietta E. Cameron, Jason Andrae
 * Last Modified: 4-17-2016
 *
 *
 */

var gl;

//changed axis to booleans
var xAxis = true;
var yAxis = false;
var zAxis = false;

var change = false; // boolean for if it is necessary to update coords
var mouseDown = false; // boolean for if mouse is being pressed
var delayGlobal = 500; // global delay value in milliseconds
var coords = []; // array to store coord objects
var queueLength = 8; //number of coords to be stored

var theta = [0, 0, 0];

var thetaLoc;
var elementCount; //number of indices
var indexCount = 0; // Offset for previous ring indices

/**
 * Test cases:
 * User mousedown on canvas, mouseup on canvas
 * User mousedown on canvas, drags off canvas, mouseup off canvas
 * mousedown off canvas, mouseup off canvas
 * mousedown off canvas, drags on canvas, mouseup on canvas
 * mousedown on canvas, drags off canvas, drags on canvas, mouseup on canvas
 * mousedown off canvas, drags on canvas, drags off canvas, mouseup off canvas
 */
function testCoords(){
  var $canvas = $('#gl-canvas'),
      myInterval;




  $canvas.on('hover', function(){
    if(mouseDown){
      myInterval = window.setInterval(paint,delayGlobal);
    }
  }, function(){
    window.clearInterval(myInterval);
  });
}

/**
 * Function to update page every render frame
 */
function update(){
  // if a change has been made, update window to reflect
  if(change){
    // Remove all elements within coord table
    $('#coords').empty;
    var $row = $('<tr>');
    // for each set of coordinates
    for(var i=0; i<coords.length; i++){
      // pull out x&y and add to a data field in table
      var $data = $('<td>').text(coords[i].x+', '+coords[i].y);
      $row.append($data);
    }
    $('#coords').append($row);
    // Set change to false
    change = !change;
  }
}

/**
 * Function to initialize page logic on page load
 */
function initWindow(){
  // fill queue with empty coordinates
  for(var i=0; i<queueLength; i++){
    coords.push({'x':i,'y':i});
  }
  change = true;

  // Add event handler for when user clicks on canvas
  $(window).on('mousedown', function(){
    mouseDown = true;
    console.log(mouseDown)
    $(window).on('mouseup',function(){
      if(mouseDown){
        mouseDown = false;
        console.log(mouseDown)
      }
    })
  });
}

function canvasMain() {
    //load webGL
    initWindow();
    console.log(coords)
    var canvas = document.getElementById("gl-canvas"); //must be in html
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
    }

    // clear the background (with white)
    gl.clearColor(0.95, 0.95, 0.95, 1.0);
    gl.enable(gl.DEPTH_TEST);//enabling z buffer
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); //using z buffer and colors, reset both

    //  Load shaders and initialize attribute buffers
    var program = initShaders(gl, "vertex-shader", "fragment-shader");

    gl.viewport(0, 0, canvas.width, canvas.height);

    //event listeners for buttons
    $('#xButton').on('click',function() {
      $(this).toggleClass('btn-danger'); //toggles between red and green buttons
      $(this).toggleClass('btn-success');
      xAxis = !xAxis; //toggles axis
    });

    $('#yButton').on('click',function() {
      $(this).toggleClass('btn-danger');
      $(this).toggleClass('btn-success');
      yAxis = !yAxis;
    });

    $('#zButton').on('click',function() {
      $(this).toggleClass('btn-danger');
      $(this).toggleClass('btn-success');
      zAxis = !zAxis;
    });

    testCoords();

    render();
    //drawObject(gl, program, piece);

}//CanvasMain


function drawObject(gl, program, obj) {

    // set the shader to use
    gl.useProgram(program);


    // array element buffer

    var iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(obj.indices), gl.STATIC_DRAW);

    // color array atrribute buffer

    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(obj.colors), gl.STATIC_DRAW);

    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    // vertex array attribute buffer

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(obj.vertices), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    thetaLoc = gl.getUniformLocation(program, "theta");
    elementCount = obj.indices.length;

    render();

}//drawObject

function render()
{
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //only spin axis that are currently turned on (true)
    if (xAxis){
      theta[0] += 2.0; //rotate by 2 degrees
    }
    if (yAxis){
      theta[1] += 2.0; //rotate by 2 degrees
    }
    if (zAxis){
      theta[2] += 2.0; //rotate by 2 degrees
    }

    update();

    //gl.uniform3fv(thetaLoc, theta); //find theta in html and set it

    //gl.drawElements(gl.TRIANGLES, elementCount, gl.UNSIGNED_SHORT, 0);  //draw elements; elementCount number of indices

    requestAnimFrame( render );
}

/**
 * Function to randomly select a color from the predetermined JSON object, and
 * randomly select a saturation value
 */
function getColor(isSat){
  var colorVals = [];
  var i;
  var palette = [
  	  {"name":"vivid_yellow","rgb":[255, 179, 0]},
      {"name":"vivid_orange","rgb":[255, 104, 0]},
  	  {"name":"very_light_blue","rgb":[166, 189, 215]},
  	  {"name":"vivid_red","rgb":[193, 0, 32]},
  	  {"name":"grayish_yellow","rgb":[206, 162, 98]},
  	  {"name":"medium_gray","rgb":[129, 112, 102]},
  	  {"name":"vivid_green","rgb":[0, 125, 52]},
  	  {"name":"strong_purplish_pink","rgb":[246, 118, 142]},
  	  {"name":"strong_blue","rgb":[0, 83, 138]},
  	  {"name":"strong_yellowish_pink","rgb":[255, 122, 92]},
  	  {"name":"strong_violet","rgb":[83, 55, 122]},
  	  {"name":"vivid_orange_yellow","rgb":[255, 142, 0]},
  	  {"name":"strong_purplish_red","rgb":[179, 40, 81]},
  	  {"name":"vivid_greenish_yellow","rgb":[244, 200, 0]},
  	  {"name":"strong_reddish_brown","rgb":[127, 24, 13]},
  	  {"name":"vivid_yellowish_green","rgb":[147, 170, 0]},
  	  {"name":"deep_yellowish_brown","rgb":[89, 51, 21]},
  	  {"name":"vivid_reddish_orange","rgb":[241, 58, 19]},
  	  {"name":"dark_olive_green","rgb":[35, 44, 22]}
    ];
  //randomly select one color from palette
  var rgbVals = palette[Math.floor(Math.random()*palette.length)].rgb;
  for (i=0; i<rgbVals.length; i++) {
    //RGB Values are stored as ints, divide by 256 to keep same color scheme
    colorVals.push(rgbVals[i]/256);
  }
  /**for completely random saturation, keep following line
   * If full saturation parameter was passed to function, then saturation will be
   * 1, else will be a random value
   */
  //isSat ? colorVals.push(1) : colorVals.push(Math.random());
  //for random saturation with minimum threshold, keep following lines
  var lowerFloorPerCent = 0.67; //change minimum saturation percentage here
  colorVals.push((Math.random()*(1-lowerFloorPerCent)+(lowerFloorPerCent)));

  return colorVals;
}

/**
 * Function to use getColor to get an array of predetermined color arrays, sorted
 * in by saturation value
 */
function getPalette(paletteSize){
  var palette = [],
      i;
  //Fill palette with randomized colors
  for (i=0; i < paletteSize; i++){
    palette.push(getColor());
  }
  //sort palette by satration value (value at index 3)
  palette.sort(function(a, b){return a[3]-b[3]});

  return palette;
}

/**
 * Function to delay the check for a certain function some action to a predetermined interval
 */
$(function() {
  var timer_id;
  var delay = 100;
/*
  $(element).on('event',function(){
    clearTimeout(timer_id);
    timer_id = setTimeout(function() {
      functionToPerform();
    }, delay);
  });
*/
});
