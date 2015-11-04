

function render_text( gl, prog, svars, paddles, chars )
{
    gl.useProgram(prog);

    for( var pad = 0; pad < 2; ++pad )
    {
        var str_len = paddles[pad].score_text.length;
        for( var i = 0; i < str_len; ++i )
        {
            var digit = paddles[pad].score_text[i].digit;
            var FSIZE = chars[digit].verts.BYTES_PER_ELEMENT;

            //            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, chars[digit].tex);
            gl.uniform1i(svars.u_sampler, gl.TEXTRUE0);

            gl.uniformMatrix4fv(
                    svars.u_xform,
                    false,
                    paddles[pad].score_text[i].offset.elements );
            gl.bindBuffer( 
                    gl.ARRAY_BUFFER, 
                    chars[digit].buffer );
            gl.vertexAttribPointer(
                    svars.a_pos,
                    2,
                    gl.FLOAT,
                    false,
                    4 * FSIZE,
                    0
                    );
            gl.vertexAttribPointer(
                    svars.a_tex_coord,
                    2,
                    gl.FLOAT,
                    false,
                    4 * FSIZE,
                    2 * FSIZE
                    );
            gl.drawArrays(
                    gl.TRIANGLE_STRIP,
                    0,
                    4 );
        }
    }
}


function init_chars( gl, svars, chars )
{
    for( var i = 0; i < 10; ++i )
    {
        chars[i].buffer = gl.createBuffer();
        if( chars[i].buffer )
        {
            console.log("'" + chars[i].name + "' buffer created.");
        }
        else
        {
            console.log("Could not create '" + chars[i].name + "' buffer.");
        }

        var FSIZE = chars[i].verts.BYTES_PER_ELEMENT;
        gl.bindBuffer(gl.ARRAY_BUFFER, chars[i].buffer);
        gl.bufferData(gl.ARRAY_BUFFER, chars[i].verts, gl.STATIC_DRAW);
        gl.vertexAttribPointer(
                svars.a_pos, chars[i].vert_size, gl.FLOAT, false, 4 * FSIZE, 0);
        gl.enableVertexAttribArray(svars.a_pos);
        gl.vertexAttribPointer(
                svars.a_tex_coord,
                chars[i].tex_coord_size,
                gl.FLOAT,
                false,
                4 * FSIZE,
                2 * FSIZE);
        gl.enableVertexAttribArray(svars.a_tex_coord);
    }
}








function make_text( num, width, justified, x, y, h)
{
    var text = num.toString();

    var str = [];

    if( justified > 0 )
    {
        for( var q = 0; q < text.length; ++q ) //generate left-to-right.
        {        
            var pos = new Matrix4;
            pos.setTranslate(x, y + h, 0);
            pos.translate(justified * width * q, 0, 0);
            str.push({
                digit:  text.charCodeAt(q) - 0x30,
                offset: pos
            });
        }
    }
    else
    {
        for( var q = text.length - 1; q >= 0; --q ) //generate right-to-left.
        {
            var pos = new Matrix4;
            var c_offset = text.length - q - 1;
            pos.setTranslate(x, y + h, 0);
            pos.translate(justified * width * c_offset, 0, 0);
            str.push({
                digit : text.charCodeAt(q) - 0x30,
                offset: pos
            });
        }
    }

    return str;
}

//  Creating a temporary 1x1 texture until the actual image is loaded it taken
//from webglfundamentals.org
function init_text(gl, s_vars)
{
    gl.activeTexture(gl.TEXTURE0);
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture );
    //Create temporary 1x1 transparent texture.
    gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            1, 1, 0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            new Uint8Array([ 0, 255, 255, 255]));

    //load the image.
    var image = new Image();
    image.onload = function()
    {
        //gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        //replace temp texture with image when loaded.
        gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                image );

        console.log("Text texture, loaded.");
    };
    image.src = "./resource/numbers.png";

    var vertecies = new Float32Array
        ([
         -1/32, 1/32,
         1/32, 1/32,
         -1/32, -1/32,
         1/32, -1/32
        ]);

    var chars = [];
    for( var num = 0; num < 10; num++ )
    {
        chars.push({
            name: num.toString(),
            verts:new Float32Array(
                    interleave( vertecies, gen_tex_coord(num), 2, 2)
                    ),
            buffer: 0,
            width: 1/16,
            vert_size: 2,
            tex_coord_size: 2,
            tex: texture
        });
    }

    return chars;
}

function gen_tex_coord( num )
{
    coords = new Float32Array
        ([
         0.0, 1 - (num / 16),
         1.0, 1 - (num / 16),
         0.0, 1 - ((num + 1) / 16),
         1.0, 1 - ((num + 1) / 16)
        ]);

    return coords;
}

function interleave( first, second, num_1st, num_2nd )
{
    var output = [];

    if( (first.length / num_1st) != (second.length / num_2nd) )
        return output;

    for( var i = 0; (i * num_1st) < first.length; i++ )// += num_1st )
    {
        for( var j = (num_1st * i); j < (num_1st + (num_1st*i)); ++j )
        {
            output.push( first[j] );
        }
        for( var j = (num_2nd * i); j < (num_2nd + (num_2nd*i)); ++j )
        {
            output.push( second[j] );
        }
    }

    return output;
}

function set_ts_vars(gl, program, vars)
{
    gl.useProgram(program);

    vars.a_pos = 
        gl.getAttribLocation( program, 'a_pos' );
    if( vars.a_pos < 0 )
    {
        console.log("Failed to bind location of 'a_pos.'");
        return;
    }

    vars.a_tex_coord =
        gl.getAttribLocation( program, 'a_tex_coord' );
    if( vars.a_tex_coord < 0 )
    {
        console.log("Failed to bind location of 'a_tex_coord.'");
        return;
    }

    vars.u_xform =
        gl.getUniformLocation( program, 'u_xform' );
    if( vars.u_xform < 0 )
    {
        console.log("Failed to bind location of 'u_xform.'");
        return;
    }

    vars.u_sampler =
        gl.getUniformLocation( program, 'u_sampler' );
    if( vars.u_sample < 0 )
    {
        console.log("Failed to bind location of 'u_sampler.'");
        return;
    }
}
