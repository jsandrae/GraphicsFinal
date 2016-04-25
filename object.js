/**
 *
 * @author:  Edward Angel
 * Modified by Marietta E. Cameron, Jason Andrae, Andrew Petriccione, Brett Hodges
 * Last Modified: 4-17-2016
 *
 *
 */

var gl;

//changed axis to booleans
var xAxis = true;
var yAxis = false;
var zAxis = false;

var isChange = false; // boolean for if it is necessary to update coords
var delayGlobal = 100; // global delay value in milliseconds
var coords = []; // array to store coord objects
var queueLength = 11; //number of coords to be stored
var myTimeout; // timeout id to be cleared upon completion
var coordTimeout; // timeout id for coord update
var xCoord, yCoord; // Global coordinate for mouse location on page, to be updated by event handlers

var midX, midY; // mid value for canvas, only recalculated on window resize

// Flags
var isMouseDown = false; // flag for if mouse is being pressed
var isWithinCanvas = false; // flag for if mouse is within canvas
var isPaintEvent = false; // flag for if should be painting
var isPaintDelay = false; //flag for limiting number of paint events in a given interval

// jQuery selector variables
var $window,
    $canvas,
    $document;

var theta = [0, 0, 0];

var thetaLoc;
var elementCount; //number of indices
var indexCount = 0; // Offset for previous ring indices

function testCoords(event){
  var x = xCoord,
      y = yCoord;

  var newCoords = translateCoords(x,y);

  // Add new coordinate to front of coords array
  coords.unshift(newCoords);
  // Pop off last element of array (oldest)
  coords.pop();
  // Toggle isChange flag
  isChange = !isChange;
}

/**
 * Function to take pixel coordinates and transpose them to the webGL coord system
 */
function translateCoords(x,y){

  // transposed x = (x-mid)/mid
  var xT = myRound((x-midX)/midX,3);
  // transposed y = (mid-y)/mid
  var yT = myRound((midY-y)/midY,3);
  return {'x':xT,'y':yT};
}

/**
 * Function to update page every render frame
 * Handles state of isPaintEvent flag. Flag gets set to true if all
 *  conditions are met.
 * Conditions:
 * 1. Mouse is being pressed
 * 2. Mouse is within canvas window
 * 3. Not currently exectuing paint function
 */
function update(){
  // update paintEvent: mousedown + mouseInCanvas + !inDelay
  isPaintEvent = isMouseDown && isWithinCanvas && !isPaintDelay;
  // if paint event is true, user is correctly engaging paint, try to paint
  if(isPaintEvent){
    paintEvent();
  }

  // if a change has been made, update window to reflect
  if(isChange){
    // Remove all elements within coord table
    $('#coords').empty();
    var $row = $('<tr>');
    // for each set of coordinates
    for(var i=0; i<coords.length; i++){
      // pull out x&y and add to a data field in table
      var $data = $('<td>').text(coords[i].x+','+coords[i].y);
      $row.append($data);
    }
    $('#coords').append($row);
    // Set isChange to false
    isChange = !isChange;
  }
}

/**
 * Function to trigger a paint event, but wrap in a delay function
 */
function paintEvent(){
  // Painting event is true, check to see if we're already painting
  // Start paint event, flip delay flag
  isPaintDelay = !isPaintDelay; // isPaintDelay === true
  // clear previous timeout and set new one
  clearTimeout(myTimeout);
  myTimeout = setTimeout(doPaint,delayGlobal);
}

/**
 * Function to actually perform the painting
 */
function doPaint(){
  console.log("painting")
  $canvas.trigger('paint:on'); // trigger paint:on custom canvas event
  // done with painting event, flip delay flag
  isPaintDelay = !isPaintDelay;
}

/**
 * Function to initialize page logic on page load
 */
function initWindow(){
  // set jQuery selectors
  $window = $(window);
  $canvas = $('#gl-canvas');
  $document = $(document);
  midX = Math.floor($canvas.width()/2);
  midY = Math.floor($canvas.height()/2);

  // fill queue with empty coordinates
  for(var i=0; i<queueLength; i++){
    coords.push({'x':i,'y':i});
  }
  isChange = true;
  // mouse left canvas, turn off flag
  $canvas.on('mouseout',function(){
    isWithinCanvas = false;
  })

  // mouse entered canvas, turn on flag
  $canvas.on('mouseover', function(){
    isWithinCanvas = true;
  })

  // create custom event handler for when paint needs to occur
  $canvas.on('paint:on',function(event){
    testCoords();
  })

  // mouse button pressed, turn on flag and provide event handler for turning off flag
  $document.on('mousedown', function(e){
    isMouseDown = true;
    //update coordinates if mouse is within canvas
    if(isWithinCanvas){
      updateCoords(e);
    }

    // add event handler for when mouse moves within canvas
    $document.on('mousemove', function(evt){
      if(isWithinCanvas){
        updateCoords(evt);
      }
    })

    $window.on('mouseup', function(){
      isMouseDown = false;
    });
  });

  $window.on('resize', resizeWindow());

  //event listeners for buttons
  $('#colorButton').on('click',function() {
    openPalette(this);


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
}

function resizeWindow(){
  midX = Math.floor($canvas.width()/2);
  midY = Math.floor($canvas.height()/2);
}

function updateCoords(e){
  var offset = $canvas.offset();
  var x = e.pageX - offset.left;
  var y = e.pageY - offset.top;

  xCoord = x;
  yCoord = y;
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

function openPalette($button){

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
 * Function to round numbers to a given number of decimal points
 */
function myRound(number, decimals){
  debugger;
  var exp = Math.pow(10,decimals);
  return Math.round(number*exp)/exp;
}
