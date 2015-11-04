/**Thomas Russel Carrel
 *
 * pong.js
 */

"use strict";

/**Some constants to keep things consistant
*/
const UP = 1; const DOWN = -1;
const RIGHT = -1; const CENTER = 0; const LEFT = 1;
const NEG = -1; const POS = 1;
// I could not figure out how to pass variables to onkey()
var move = [0, 0];


/**Calls all the init functions and calls the first animation frame.
*/
function main()
{

    // Init stuff...
    var canvas = document.getElementById('render_to');
    var gl = getWebGLContext(canvas);

    if( !gl ) 
    {
        console.log('Could not get WebGL rendering context.');
        return;
    }

    var shaders = get_shaders();
    var programs = [];
    programs.push( createProgram( gl, shaders[0], shaders[1] ) );
    gl.useProgram( programs[0] );
    programs.push( createProgram( gl, shaders[2], shaders[3] ) );
    if( !(programs[0] || programs[1]) )
    {
        console.log('Shaders could not initialize.');
        return;
    }
    else
    {
        console.log("All shaders created successfully.");
    }

    var sounds = {
        w: new Audio("./resource/wall.mp3"),
        p: new Audio("./resource/padb.mp3"),
    };

    //Get shader var locations
    var shader_vars = {};
    set_s_vars(gl, programs[0], shader_vars);

    var t_shader_vars = {};
    set_ts_vars(gl, programs[1], t_shader_vars);

    //  Most fractional values used are 1/(2^x) to minimize floating point
    //errors.

    //Create shapes
    var walls = get_walls(gl, programs[0]);
    var lines = get_lines(gl, programs[0]);

    var ball =
    {
        name: "ball",
        verts: circle_verts(180, 0, 0, 1/64, true),
        radius: 1/64,
        color: rgba32(255, 255, 0, 255),
        mode: gl.TRIANGLE_FAN,
        buffer: 0,
        model_matrix: new Matrix4,
        x: 0, y: 0,
        deltap:{ x:1, y:1 },
        velocity:1024 //Not really the velocity, but used in the calculation.
    };
    normalize( ball.deltap );
    new_vec( ball.deltap );

    var paddle = get_paddles(gl, programs[0]);

    //  Because of JavaScript's use of pass-by-reference for all objects,
    //storing them in a second array like this allows for easy access of
    //individual types.
    var shapes = [
        walls[0], walls[1],
        lines[0], lines[1],
        ball,
        paddle[0], paddle[1] 
    ];



    init_models(gl, shader_vars, shapes);
    var chars = init_text(gl, t_shader_vars );
    init_chars(gl, t_shader_vars, chars);

    var bg = init_bg(gl, t_shader_vars)

    var clear = [0,0,0,1];//rgba32(255, 45, 218, 255);

    gl.clearColor(clear[0], clear[1], clear[2], clear[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);

    //  Pre-render the first frame before showing the instructions.
    render( gl, programs[0], shader_vars, shapes );
    update_score( paddle, chars );
    render_text( gl, programs[1], t_shader_vars, paddle, chars );

    show_instructions();
    var chrono = Date.now();
    var tick   = function()
    {
        if( update_ball( ball, paddle, sounds, chrono ) )
        {
            ball.x = 0; ball.y = 0;
            ball.model_matrix.setTranslate(0, 0, 0);
            new_vec( ball.deltap );
            paddle[0].y = paddle[1].y = 0.0;
        }
        update_paddles(paddle);
        update_score( paddle, chars );

        chrono = Date.now(); // Update chrono after all other update functions.
        render_bg(   gl, programs[1], t_shader_vars, bg );
        render(      gl, programs[0],   shader_vars, shapes );
        render_text( gl, programs[1], t_shader_vars, paddle, chars );

        requestAnimationFrame( tick, canvas );
    };
    tick();
}

/**Updates the balls animation.
 * @param {ball} ball - The ball object.
 * @param {paddle array} paddle - array of paddles
 * @param {int array} score - The current scores.
 * @param {Sound array} - An array containing the game's sounds.
 * @param {Date} chrono - The time at the end of the last update step.
 * @return {boolean} true if the ball left the screen.
 */
function update_ball(ball, paddle, snd, chrono) 
    //needs walls and paddles for collision detection.
{
    var dur = Date.now() - chrono;

    // Check if previous movement resulted in a victor.
    if( ball.x < -1 )
    {
        paddle[1].score++;
        if( ball.velocity > 768 )
            ball.velocity -= 8;
        return true;
    }

    if( ball.x > 1 )
    {
        paddle[0].score++;
        if( ball.velocity > 768 )
            ball.velocity -= 8;
        return true;
    }

    var speed_factor = (dur / ball.velocity);
    var x_change = speed_factor * ball.deltap.x;
    var y_change = speed_factor * ball.deltap.y;

    ball.x += x_change;
    ball.y += y_change;

    ball.model_matrix.translate(x_change, y_change, 0);

    // Check for collisions with the walls, hard coded because they're fixed.

    if( ball.y + ball.radius >= 15/16 ||
            ball.y - ball.radius <= -15/16 )
    {
        if( sign(ball.deltap.y) == sign(ball.y) )
        {
            ball.deltap.y = -ball.deltap.y; // change y-direction
            snd.w.play();
        }
    } 

    // Do collision checks for the paddles, unless ball isn't near the edges.
    if( Math.abs(ball.x) > 7/8 )
    {
        var q = (sign(ball.x) == 1) ? 1 : 0;
        if( paddle_collision(paddle[q], q, ball ) )
            snd.p.play();
        //  It's not necessary to re-normalize the movement vector if one of its
        // elements just had its sign changed.
        normalize(ball.deltap);
    }

    return false;
}

/**Checks for a collision with a paddle and updates the ball's movement vector
 * as necessary.
 * @param {paddle} paddle - A single paddle object.
 * @param {int} ab - A  number representing which paddle is being checked.
 * @param {ball} ball - The ball object.
 * @return {bool} Should a sound be played?
 */
function paddle_collision(paddle, ab, ball)
{
    var height = paddle.height; // Needed later, so store it now to make the
    //follow ternary simpler to read.

    var is_collision = (ab == 0) ?
        (ball.x - ball.radius < paddle.x + paddle.width &&
         ball.x + ball.radius > paddle.x + paddle.width &&
         ball.y < paddle.y + height &&
         ball.y > paddle.y - height &&
         sign(ball.deltap.x) == -1)
        :
        (ball.x - ball.radius < paddle.x - paddle.width &&
         ball.x + ball.radius > paddle.x - paddle.width &&
         ball.y < paddle.y + height &&
         ball.y > paddle.y - height &&
         sign(ball.deltap.x) == 1);

    var is_behind_paddle = (ab == 0) ?
        ball.x < paddle.x + paddle.width:
        ball.x > paddle.x - paddle.width;

    // The combination of these ensures that a collision won't be detected
    //if a player moves their paddle into possition in front of the ball after
    //it's passed behind the paddle.
    if( !is_collision || is_behind_paddle )
        return false;

    //Store the x direction OPPOSITE the ball's current direction of travel.
    var deltap_x = (ab == 0) ? LEFT : RIGHT;

    // Distance of ball from center of paddle.
    var dy = ball.y - paddle.y;
    if( Math.abs(dy) < (1/64) ) // Add dead space in the center.
    {
        dy = 0;
    }
    ball.deltap.x = deltap_x;
    //Multiplying by 3/PI ensures a maximum angle of +/- 60 degrees.
    ball.deltap.y = (dy/height) * (3 / Math.PI);

    return true;
}


/** Updates the location of the paddles based on user inputs.
 * @param {paddles array} paddles - an array containing the paddles.
 */
function update_paddles(paddles)
{
    for( var q = 0; q < 2; q++ )
    {
        if( can_move(paddles[q].y, paddles[q].height, move[q]) )
            paddles[q].y += (1/32) * move[q];

        paddles[q].model_matrix.setTranslate( paddles[q].x, paddles[q].y, 0 );
    }
}

/** Checks if a paddle can be moved.
 * @param {float} y - Y-coordinate of the paddle.
 * @param {float} h - The height of the paddle.
 * @return {boolean} true if the paddle can be moved.
 */
function can_move(y, h, dir)
{
    switch( dir )
    {
        case UP:
            if( (y + h) < (1 - 1/16) )
            {
                return true;
            }
            break;
        case DOWN:
            if( (y - h) > (1/16 - 1) )
            {
                return true;
            }
            break;
        default:
            return false;
    }
    return false;
}

/** Renders all shapes in the array.  Duplicated from a previous assignment.
 * @param {gl} gl - The current WebGL context.
 * @param {shaders object} shader_vars - The necessary shader variables.
 */
function render( gl, program, shader_vars, shapes )
{
    //clear the context (canvas).
    //gl.clear( gl.COLOR_BUFFER_BIT );

    //Draw all shapes. 
    gl.useProgram(program);
    var shape_qty = shapes.length;
    for( var q = 0; q < shape_qty; q++ )
    {

        gl.uniform4fv(
                shader_vars.u_color,
                shapes[q].color );
        gl.uniformMatrix4fv(
                shader_vars.u_xform,
                false,
                shapes[q].model_matrix.elements );
        gl.bindBuffer( gl.ARRAY_BUFFER, shapes[q].buffer);
        gl.vertexAttribPointer(
                shader_vars.a_pos, 2, gl.FLOAT, false, 0, 0 );
        gl.vertexAttrib1f( shader_vars.a_p_size, shapes[q].point_size );
        gl.drawArrays(
                shapes[q].mode,
                0,
                shapes[q].verts.length / 2 );

    }
}

/** Returns a Float32Array containing ordered pairs of coordinates describing a
 * circle.  Duplicated from a previous assignment.
 * @param {int} steps - How many vertices will be on the circle's circumference.
 * @param {float} x - X-coordinate of the desired circle.  Zero in most cases.
 * @param {float} y - Y-coordinate of the desired circle.  Zero in most cases.
 * @param {float} radius - The radius of the desired circle.
 * @param {bool} center - Whether or not to include the circle's origin.
 */
function circle_verts(steps, x, y, radius, center)
{
    var vert_qty = steps + 2; 
    var step_arc = 360 / steps;
    var angle    = 0;

    var circle = center ? [ 0.0, 0.0 ] : [];

    // Step through the circle calculating coords one vert at a time.
    for( var vert_cur = 1; vert_cur < vert_qty; vert_cur++ )
    {
        var i         = vert_cur * 2;
        var theta     = (Math.PI / 180.0) * angle; // Winners use radians...

        // Convert from polar to cartesian coordinates and store point.
        circle.push(radius * Math.cos(theta)) + x;
        circle.push(radius * Math.sin(theta)) + y;

        angle         = angle + step_arc; // Update angle for next itteration.
    }

    return new Float32Array(circle);
}

/** Initializes all the models, by creating a buffer and sending the vertex
 * data for each one to the GPU.
 * @param {gl} gl - The target WebGL context.
 * @param {shaders object} shader_vars - The necessary shader variables.
 * @return {bool} true if all initializations were successful.
 */
function init_models(gl, shader_vars, shapes)
{
    for(var i = 0; i < shapes.length; i++ )
    {
        shapes[i].buffer = gl.createBuffer();
        {
            if ( shapes[i].buffer )
            {
                console.log(
                        '## "' + shapes[i].name + '" was created succesfully.'
                        );
            }
            else
            {
                console.log(
                        'Failed to create "' +
                        shapety[i].name +
                        '" [' + i + "] buffer."
                        );
                return false;
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, shapes[i].buffer);
            gl.bufferData(gl.ARRAY_BUFFER, shapes[i].verts, gl.STATIC_DRAW);
            gl.vertexAttribPointer(
                    shader_vars.a_pos, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(shader_vars.a_pos);
        }
    }
    return true;
}


/**Gets the locations of all the necessary shader variables.
 * @param {g} gl - The WebGL rendering context.
 * @param {shaders object} s_vars - The necessary shader variables.
 */
function set_s_vars( gl, program, s_vars )
{
    gl.useProgram(program);

    s_vars.u_xform =
        gl.getUniformLocation( program, 'u_xform');
    if( s_vars.u_xform < 0 )
    {
        console.log("Failed to bind location of 'u_xform.'");
        return;
    }

    s_vars.a_pos = gl.getAttribLocation( program, 'a_pos');
    if( s_vars.a_pos < 0 )
    {
        console.log("Failed to bind location of 'a_pos.'");
        return;
    }

    s_vars.u_color = gl.getUniformLocation( program, 'u_color');
    if( s_vars.u_color < 0 )
    {
        console.log("Failed to bind location of 'u_color.'");
        return;
    }
}

/**Updates the display of the scores.
 * @param {int array} score - An array containing each player's score.
 */
function update_score(paddles, chars)
{
    paddles[0].score_text = make_text( 
            paddles[0].score,
            1/16,
            LEFT,
            paddles[0].x,
            paddles[0].y,
            paddles[0].height );
    paddles[1].score_text = make_text(
            paddles[1].score,
            1/16,
            RIGHT,
            paddles[1].x,
            paddles[1].y,
            paddles[1].height );
}

/**Detects a keydown event.
 * @param {event} e - The page's event queue.
 */
function key_down(e)
{
    switch( e.which )
    {
        case 81: // q-key
            move[0] = UP;
            return;
        case 65: // a-key
            move[0] = DOWN;
            return;
        case 79: // o-key
            move[1] = UP;
            return;
        case 76: // l-key
            move[1] = DOWN;
            return;
    }
}

/**Detects a keyup event.  Note that pressing [F5] to refresh the page will
 * create the error "key_up is not defined" since script for that function
 * would not yet have been loaded at that point.
 * @param {event} e - The page's event queue.
 */
function key_up(e)
{
    switch( e.which )
    {
        case 81:
            move[0] = 0;
            return;
        case 65:
            move[0] = 0;
            return;
        case 79:
            move[1] = 0;
            return;
        case 76:
            move[1] = 0;
            return;
    }
}

/**Creates a newly randomizes movement vector for the ball.
 * @param {float, float} vector - A reference to the ball's deltap sub-object.
 */
function new_vec(vector)
{

    vector.x = Math.random();
    // y-element should be smaller than the x-element
    vector.y = (vector.x * Math.random());

    var neg = Math.random() - 0.5;
    if( neg < 0 )
    {
        vector.x = -1 * vector.x
    }

    normalize(vector);
}

/**Converts a vector to a unit vector.
 * @param {float, float} vector - A reference to the ball's deltap sub-object.
 */
function normalize(vector)
{
    var x2 = vector.x * vector.x;
    var y2 = vector.y * vector.y;

    var scalar = Math.sqrt(x2 + y2); 

    vector.x = vector.x / scalar;
    vector.y = vector.y / scalar;
}

/**Gets an array containing the walls.
 * @param {gl} gl - The WebGL rendering context.
 * @return {array} an array of scene objects.
 */
function get_walls(gl, prog)
{
    // height attributes are half the actual value for conveniece.
    var walls = [];
    walls.push(
            {
                name: "wall",
                height: 1/32,
                verts: new Float32Array
                    ([
                     -1.0, 1/32,
                     1.0, 1/32,
                     -1.0, -1/32,
                     1.0, -1/32
                    ]),
                color: rgba32( 255, 127, 39, 255 ),
                mode: gl.TRIANGLE_STRIP,
                buffer: 0,
                model_matrix: new Matrix4,
                y: 31/32 // Store for convenience.
            });
    walls[0].model_matrix.setTranslate(0, walls[0].y, 0);
    walls.push(
            {
                name: "wall",
                height: 1/32,
                verts: new Float32Array
                    ([
                     -1.0, 1/32,
                     1.0, 1/32,
                     -1.0, -1/32,
                     1.0, -1/32
                    ]),
                color: rgba32( 255, 127, 39, 255 ),
                mode: gl.TRIANGLE_STRIP,
                buffer: 0,
                model_matrix: new Matrix4,
                y: -31/32
            });
    walls[1].model_matrix.setTranslate(0, walls[1].y, 0);

    return walls;
}

/**Gets an array containing the paddles.
 * @param {gl} gl - The WebGL rendering context.
 * @return {array} an array of scene objects.
 */
function get_paddles(gl)
{
    var h = 1/8; var w = 1/64; // For ease of use, these are actually half
    //their respective values.
    var paddle = [];

    paddle.push(
            {
                name: "paddle",
                height: h,
                width: w, // Actually width / 2
                x: -1 + (3*w), y: 0,
                verts: new Float32Array
                    ([
                     -w, h,
                     w, h,
                     -w, -h,
                     w, -h
                    ]),
                color: rgba32( 255, 0, 0, 255 ),
                mode: gl.TRIANGLE_STRIP,
                buffer: 0,
                model_matrix: new Matrix4,
                score: 0,
                score_text: 0
            });
    paddle[0].model_matrix.setTranslate(paddle[0].x, 0, 0);
    paddle.push(
            {
                name: "paddle",
                height: h,
                width: w,
                x: 1 - (3*w), y: 0,
                verts: new Float32Array
                    ([
                     -w, h,
                     w, h,
                     -w, -h,
                     w, -h
                    ]),
                color: rgba32( 255, 127, 127, 255 ),
                mode: gl.TRIANGLE_STRIP,
                buffer: 0,
                model_matrix: new Matrix4,
                score: 0,
                score_text: 0
            });
    paddle[1].model_matrix.setTranslate(paddle[1].x, 0, 0);

    return paddle;
}

function get_lines( gl, prog )
{
    var lines = [];
    lines.push({
        name: "lines",
        verts: new Float32Array
            ([
             -15/16, 15/16,
             -15/16, -15/16,
             0, -15/16,
             0, 15/16,
             15/16, 15/16,
             15/16, -15/16
            ]),
        color: rgba32(255, 255, 0, 255),
        mode: gl.LINES,
        buffer: 0,
        model_matrix: new Matrix4
    });

    lines.push({
        name: "circle",
        verts: circle_verts(180, 0, 0, 0.5, false),
        color: rgba32(255, 255, 0, 255),
        mode: gl.LINE_LOOP,
        buffer: 0,
        model_matrix: new Matrix4
    });

    //Scale the circle to compensate for the canvas's aspect ratio.
    lines[1].model_matrix.setScale(3/4, 1, 1, 1);

    return lines;
}

/**Displays an alert box containing the instructions for the game.*/
function show_instructions()
{
    /*
       alert("CONTROLS:\n" +
       "  Player 1:\n" +
       "    [Q] move paddle up.\n" +
       "    [A] move paddle down.\n" +
       "  Player 2:\n" +
       "    [O] move paddle up.\n" +
       "    [L] move paddle down.\n"
       );
       */
}

/**Determines the sign of a number
 * @param {float} num - The number to check.
 * @return {int} negative returns -1, positive returns 1, and 0 returns zero.
 */
function sign(num)
{
    if( num > 0 )
        return 1;

    if( num < 0 )
        return -1;

    return 0;
}
