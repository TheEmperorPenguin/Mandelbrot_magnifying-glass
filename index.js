function isWindowMaximized() {
    return window.outerWidth === window.innerWidth;
  }

function modifySquareStyle() {
    // Get the square element by id
    var square = document.getElementById('canvas');
    var outerHeight = window.outerHeight;
    var innerHeight = window.innerHeight;

    var topBarHeight = outerHeight - innerHeight;
        // Modify the style of the square
    // square.style.backgroundColor = getRandomColor(); // Change background color to a random color
    square.style.width = window.screen.width + 'px'; // Change width to a random size
    square.style.height = window.screen.height + 'px'; // Change height to a random size
    if (window === test) {
        square.style.top = - window.screenTop - topBarHeight + 'px';
        square.style.left =- window.screenLeft + 'px';
    } else if (isWindowMaximized()) {
        square.style.top = - window.screenTop - topBarHeight + 'px';
        square.style.left =- window.screenLeft + 'px';
    } else{
        square.style.top = - window.screenTop + 25 - topBarHeight + 'px';
        square.style.left =- window.screenLeft - 22 + 'px';
    }
}

var x,y = 0;
var zoom = 1.

function openMagnifyingGlass()
{
    // Get the current URL
    var url = window.location.href;

    // Define the properties of the pop-up window (size, position, etc.)

    // Open the pop-up window
    test = window.open(url, "Popup", 'width=500,height=500');
    x = window.screenLeft
    y = window.screenTop
    test.addEventListener('keypress', function(event) {

        if (event.key == 'w')
            y -= 10;
        else if (event.key == 's')
            y += 10;
        else if (event.key == 'a')
            x -= 10;
        else if (event.key == 'd')
            x += 10;
        else if (event.key == 'q')
            zoom *= 0.9;
        else if (event.key == 'e')
            zoom /= 0.9;
        test.moveTo(x,y);
    });
}

openMagnifyingGlass();

setInterval(modifySquareStyle, 1);

window.onload = function() {
    const canvas = document.getElementById('canvas');
    const gl = canvas.getContext('webgl');

    if (!gl) {
        console.error('WebGL not supported');
        return;
    }

    function resizeCanvas() {
        // Calculate the desired resolution (e.g., 800x600)
        const desiredWidth = window.screen.width;
        const desiredHeight = window.screen.height;

        // Calculate the aspect ratio of the desired resolution
        const aspectRatio = desiredWidth / desiredHeight;

        // Calculate the window's aspect ratio
        const windowAspectRatio = window.screen.width /window.screen.height;

        // Adjust the canvas size based on the window size and desired resolution
        if (windowAspectRatio > aspectRatio) {
            // Window is wider than desired resolution, adjust canvas height
            canvas.width = window.screen.height * aspectRatio;
            canvas.height = window.screen.height;
        } else {
            // Window is taller than desired resolution, adjust canvas width
            canvas.width = window.screen.width;
            canvas.height = window.screen.width / aspectRatio;
        }

        // Set the WebGL viewport to match the canvas size
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    // Vertex shader source code
    const vsSource = `
        attribute vec2 position;
        varying vec2 v_position;

        void main() {
            // Transform the vertex position to clip space
            gl_Position = vec4(position, 0.0, 1.0);

            // Pass the position to the fragment shader
            v_position = position;
        }
    `;

    // Fragment shader source code
    const fsSource = `
        precision mediump float;

        varying vec2 v_position; // Receive position from vertex shader

        uniform float u_time;
        uniform float zoom;
        uniform vec2 center;

        #define ITER 420

        #define cx_mul(a, b) vec2(a.x*b.x-a.y*b.y, a.x*b.y+a.y*b.x)
        #define cx_div(a, b) vec2(((a.x*b.x+a.y*b.y)/(b.x*b.x+b.y*b.y)),((a.y*b.x-a.x*b.y)/(b.x*b.x+b.y*b.y)))

        vec3 pal( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d )
        {
            return a + b*cos( 6.28318*(c*t+d) );
        }

        vec2 squareImaginary(vec2 number){
            return vec2(
                pow(number.x,2.)-pow(number.y,2.),
                2.*number.x*number.y
            );
        }

        vec2 GiveReflection(vec2 C)
        {
            float c2 = dot(C, C);
            if( 256.0*c2*c2 - 96.0*c2 + 32.0*C.x - 3.0 < 0.0 ) return vec2(0.0);
            if( 16.0*(c2+2.0*C.x+1.0) - 1.0 < 0.0 ) return vec2(0.0);
            vec2 Z = vec2(0.0); // initial value for iteration Z0
            vec2 dC = vec2(0.0); // derivative with respect to c 
            float reflection = 0.; // inside 
            
            float h2 = 1.4; // height factor of the incoming light
            float angle = (u_time * 100.) / 360.0; // incoming direction of light in turns 
            vec2 v = vec2(cos(2.0 * angle * 3.14159), sin(2.0 * angle * 3.14159));
            vec2 u;

            for (int i = 0; i < ITER; i++) {
                dC = 2.0 * cx_mul(dC, Z) + vec2(1.0);
                Z = squareImaginary(Z) + C;

                if (length(Z) > 10000.) { // exterior of M set
                    u = cx_div(Z, dC);
                    u = u / length(u);
                    reflection = dot(u, v) + h2;
                    reflection = reflection / (1.0 + h2);
                    if (reflection < 0.0) reflection = 0.0;

                    return vec2(reflection, (float(i) - log2(log2(length(Z))) + 4.0) / float(ITER));
                }
            }

            return vec2(reflection, 0.);
        }

        float customLerp(float t) {
        // Apply exponential function to control growth
        float growthFactor = 1.; // Adjust to control how quickly it grows initially
        float adjustedT = 1. - exp(-growthFactor * t);

        // Linear interpolation between 0 and 1
        return 1. - adjustedT;
        }


        void main()
        {
            vec2 l = vec2(0.);
            vec4 col = vec4(0.0);
                vec2 p = (center) + (v_position * 1.5) * zoom;
                l = GiveReflection(p.xy);
                gl_FragColor = vec4(l.x * vec3(1.0), 1.0);
                if (l.y == 0.0)
                    gl_FragColor = vec4(pal(customLerp(length(p) * 1.), vec3(0.5,0.5,0.5),vec3(0.5,0.5,0.5),vec3(2.0,1.0,0.0),vec3(0.5,0.20,0.25) ), 1.0);
        }
    `;

    // Create shaders
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vsSource);
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        console.error('Vertex shader compilation error:', gl.getShaderInfoLog(vertexShader));
        return;
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fsSource);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        console.error('Fragment shader compilation error:', gl.getShaderInfoLog(fragmentShader));
        return;
    }

    // Create shader program
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.error('Shader program linking error:', gl.getProgramInfoLog(shaderProgram));
        return;
    }
    gl.useProgram(shaderProgram);

    // Define vertices for two triangles making a square
    const vertices = [
        -1.0,  1.0, // Top left
        -1.0, -1.0, // Bottom left
         1.0, -1.0, // Bottom right
        -1.0,  1.0, // Top left
         1.0, -1.0, // Bottom right
         1.0,  1.0  // Top right
    ];

    // Create buffer
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    // Get attribute location and enable it
    const positionAttributeLocation = gl.getAttribLocation(shaderProgram, 'position');
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionAttributeLocation);

    // Clear the canvas
    gl.clearColor(0.0, 0.0, 0.0, 1.0); // Black background
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Draw the triangles
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    const currentTime = performance.now();

    // Pass the current time to the shader
    const timeLocation = gl.getUniformLocation(shaderProgram, 'u_time');
    const zoomLocation = gl.getUniformLocation(shaderProgram, 'zoom');
    const centerLocation = gl.getUniformLocation(shaderProgram, 'center');
    // Start the animation loop
    let startTime = null;
    function renderLoop(timestamp) {
        // Calculate elapsed time since the animation started
        if (!startTime) startTime = timestamp;
        const elapsedTime = timestamp - startTime;

        // Update the time uniform with elapsed time (in seconds)
        var timeInSeconds = elapsedTime / 10000.0;
        if (window === test) {
            gl.uniform1f(zoomLocation, zoom);
            var screenWidth = window.screen.width;
            var screenHeight = window.screen.height;
            var windowWidth = window.innerWidth;
            var windowHeight = window.innerHeight;
            var windowLeft = window.screenLeft
            var windowTop =  window.screenTop
            var centerX = windowLeft + windowWidth / 2;
            var centerY = windowTop + windowHeight / 2;
            centerX /= screenWidth;
            centerY /= screenHeight;
            centerX -= 0.5;
            centerY -= 0.5;
            centerX *= 2.;
            centerY *= -2.;
            console.log(centerX, centerY)

            gl.uniform2f(centerLocation,  centerX, centerY);
        }
        else
        {
            gl.uniform2f(centerLocation, 0., 0.);
            gl.uniform1f(zoomLocation, 1.0);
        }

        gl.uniform1f(timeLocation, timeInSeconds);
        // Clear the canvas
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Draw the triangles
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // Request the next frame
        requestAnimationFrame(renderLoop);
    }

    // Start the animation loop
    requestAnimationFrame(renderLoop);
}