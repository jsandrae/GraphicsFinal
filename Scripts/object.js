/**
 * @author:  Edward Angel
 * Modified by Marietta E. Cameron, Jason Andrae, Andrew Petriccione, Brett Hodges
 * Last Modified: 4-26-2016
 */

var gl;

//changed axis to booleans
var xAxis = true;
var yAxis = false;
var zAxis = false;

var delayGlobal = 0; // global delay value in milliseconds
var coords = []; // array to store coord objects for debug
var colors = []; // array to store colors for each point
var vertices = []; // array to store vertices to be drawn
var queueLength = 11; //number of coords to be stored
var myTimeout; // timeout id to be cleared upon completion
var coordTimeout; // timeout id for coord update
var xCoord, yCoord; // Global coordinate for mouse location on page, to be updated by event handlers
var zInc = 1000; // Z value will be incremented by 1/1000 each point
var zValue; // starting z value will be lowest possible
var pointSizes = []; // array to store point sizes

var midX, midY; // mid value for canvas, only recalculated on window resize

// Flags
var isMouseDown = false; // flag for if mouse is being pressed
var isWithinCanvas = false; // flag for if mouse is within canvas
var isPaintEvent = false; // flag for if should be painting
var isPaintDelay = false; //flag for limiting number of paint events in a given interval
var debug = false;

// buffers
var cBuffer,
    vColor,
    vBuffer,
    vPosition,
    program,
    pbuffer;

// jQuery selector variables
var $window,
    $canvas,
    $document;

var elementCount; //number of points

//User Inputs
var selected_rgb_color;
var selected_brush_size = 3.0;
var selected_opacity = 1;

/**
 * Function to take pixel coordinates and transpose them to the webGL coord system
 */
function translateCoords(x,y){
  // transposed x = (x-mid)/mid
  var xT = myRound((x-midX)/midX,3);
  // transposed y = (mid-y)/mid
  var yT = myRound((midY-y)/midY,3);
  if(xT>1 || xT<-1){
    xT = myRound(xT,0);
  }
  if(yT>1 || yT<-1){
    yT = myRound(yT,0);
  }
  return {'x':xT,'y':yT};
}

/**
 * Function to calulate the midpoint of canvas, which is used in translating
 *   page coordinates to WebGL coordinates
 */
function calulateMidpoints(){
  midX = Math.floor($canvas.width()/2);
  midY = Math.floor($canvas.height()/2);
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
    if(debug){
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
    }
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
  var tempX = xCoord,
      tempY = yCoord;

  var newCoords = translateCoords(tempX,tempY);

  if(debug){
    // Add new coordinate to front of coords array
    coords.unshift(newCoords);
    // Pop off last element of array (oldest)
    coords.pop();
  }

  var newVertex = [newCoords.x,newCoords.y];
  // newCoords is just x and y, add z and 1
  newVertex.push(zValue);
  newVertex.push(1);

  vertices.push(newVertex);
  colors.push(selected_rgb_color);
  pointSizes.push(selected_brush_size);

  // New point added, increment elementCount & zValue
  elementCount++;
  zValue += 1/zInc;

  // Update buffers
  updateBuffers();

  // done with painting event, flip delay flag
  isPaintDelay = !isPaintDelay;
}

/**
 * Function to erase all points
 */
function eraseAll(){
  vertices = [[0,0,0,1]];
  zValue = -1;
  colors = [[1,1,1,1]];
  elementCount = 1;
  pointSizes = 3.0;
  updateBuffers();
}

function updateBuffers(){
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(pointSizes), gl.STATIC_DRAW);
}

/**
 * Function to initialize page logic on page load
 */
function initWindow(){
  // set jQuery selectors
  $window = $(window);
  $canvas = $('#gl-canvas');
  $document = $(document);
  calulateMidpoints();
  vertices = [[0,0,0,1]];
  zValue = -1;
  colors = [[1,1,1,0]];
  elementCount = 1;
  pointSizes = [3.0];

  if(debug){
    // fill queue with empty coordinates
    for(var i=0; i<queueLength; i++){
      coords.push({'x':i,'y':i});
    }
    update();
  } else {
    $('#coords').addClass('hidden');
  }
  // mouse left canvas, turn off flag
  $canvas.on('mouseout',function(){
    isWithinCanvas = false;
  })

  // mouse entered canvas, turn on flag
  $canvas.on('mouseover', function(){
    isWithinCanvas = true;
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

  //event listeners for buttons and popovers
  $('#erase').on('click',function() {
    eraseAll();
  });

  //event handler for color popover
  $('[data-toggle="popover-color"]').popover({
      html : true,
      content : function () {
          return $('#color_picker').html();
      }
  });

  //Event handler for diffusion popover
  $('[data-toggle="popover-diffusion"]').popover({
      html : true,
      content : function () {
          return $('#diffusion_settings').html();
      }
  });

  //Event handler for size popover
$('[data-toggle="popover-size"]').popover({
    html : true,
    content : function () {
        return $('#size_picker').html();
    }
});

}

function resizeWindow(){
  calulateMidpoints();
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
    gl.enable(gl.DITHER);//enable dithering
    gl.enable(gl.BLEND);//enable blending
    gl.depthMask(gl.FALSE);// hide transparent elements behind opaque ones
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); //using z buffer and colors, reset both

    //  Load shaders and initialize attribute buffers
    program = initShaders(gl, "vertex-shader", "fragment-shader");

    gl.viewport(0, 0, canvas.width, canvas.height);

    // set the shader to use
    gl.useProgram(program);

    // color array atrribute buffer

    cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

    vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    // vertex array attribute buffer

    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(coords), gl.STATIC_DRAW);

    vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // point size attribute buffer

    pBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointSizes), gl.STATIC_DRAW);

    pointSize = gl.getAttribLocation(program, "pointSize");
    gl.vertexAttribPointer(pointSize, 1, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(pointSize);

    render();

}//CanvasMain

function render()
{
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    update();

    gl.drawArrays(gl.POINTS, 0, elementCount);

    requestAnimFrame( render );
}

/**
 * Function to randomly select a color from the predetermined JSON object, and
 * randomly select a saturation value
 */
function getColor(isSat){
  var colorVals = [];
  var i;
  var palette = {
  	    red:[230, 0, 0],
  	    green:[46, 184, 46],
  	    blue:[0, 102, 255],
  	    yellow:[255, 255, 0],
  	    purple:[51, 51, 153],
  	    black:[0, 0, 0],
  	    pink:[255, 102, 404],
  	    brown:[153, 102, 51],
  	    orange:[255, 153, 51]
    };
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
  var exp = Math.pow(10,decimals);
  return Math.round(number*exp)/exp;
}

/**
 * Function for retrieving RGB colors from color clicked
 * @param color
 */
function reply_click(colorName)
{
    var palette = {
        'red':[230, 0, 0],
        'green':[46, 184, 46],
        'blue':[0, 102, 255],
        'yellow':[255, 255, 0],
        'MidnightBlue':[51, 51, 153],
        'black':[0, 0, 0],
        'pink':[255, 102, 40],
        'SaddleBrown':[153, 102, 51],
        'orange':[255, 153, 51]
    };
    console.log(colorName)
    debugger;
    var temp = palette[colorName];
    var r = temp[0];
    var b = temp[1];
    var g = temp[2];
    var stringX = 'rgb('+r+','+g+','+b+')';
    $('#colorButton').css('background-color',colorName);
    var color = temp.map(function(num){
      return num/255;
    });
    color.push(selected_opacity);

    selected_rgb_color = color;
    console.log(color)
}

/**
 * Function for retrieving size value for brush
 */
function size_selection() {
    selected_brush_size = Number(document.getElementById("size_selection").value);
    console.log(selected_brush_size);
    document.getElementById("size_selected").innerHTML = selected_brush_size;
}

function oppacity_selection() {
    selected_opacity = Number(document.getElementById("opacity").value);
    console.log(selected_opacity);
    document.getElementById("opacity_selected").innerHTML = selected_opacity*100+"%";
}
