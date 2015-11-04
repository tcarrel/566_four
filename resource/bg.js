
function render_bg( gl, prog, svars, bg )
{
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(prog);

    var FSIZE = bg.verts.BYTES_PER_ELEMENT;

    gl.bindTexture(gl.TEXTURE_2D, bg.tex);
    gl.uniform1i(svars.u_sampler, gl.TEXTRUE1);

    gl.uniformMatrix4fv(
            svars.u_xform,
            false,
            bg.model_matrix.elements );
    gl.bindBuffer( 
            gl.ARRAY_BUFFER, 
            bg.buffer );
    gl.vertexAttribPointer(
            svars.a_pos,
            3,
            gl.FLOAT,
            false,
            5 * FSIZE,
            0
            );
    gl.vertexAttribPointer(
            svars.a_tex_coord,
            2,
            gl.FLOAT,
            false,
            5 * FSIZE,
            3 * FSIZE
            );
    gl.drawArrays(
            gl.TRIANGLE_STRIP,
            0,
            4 );
}


function init_bg(gl, svars)
{
    gl.activeTexture(gl.TEXTURE1);
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture );
    //generate temporary texture
    gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            1, 1, 0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            new Uint8Array([ 0, 255, 255, 255]));

    //immediately begin loading image.
    var image = new Image();
    image.onload = function(){
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                image );
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        console.log("Background texture, loaded.");
    };
    image.src = "./resource/bg.gif";


    var bg =
    {
        name:"background",
        verts: new Float32Array(
                [
                -1.0,  1.0, -0.1,  0.0,  1.0,
                1.0,   1.0, -0.1,  1.0,  1.0,
                -1.0, -1.0, -0.1,  0.0,  0.0,
                1.0,  -1.0, -0.1,  1.0,  0.0
                ]),
        buffer:gl.createBuffer(),
        model_matrix: new Matrix4,
        tex: texture
    }
    if( !bg.buffer )
    {
        console.log("Failed to create background buffer.");
    }
    else
    {
        console.log("Background buffer was created.");
    }

    var FSIZE = bg.verts.BYTES_PER_ELEMENT;
    gl.bindBuffer( gl.ARRAY_BUFFER, bg.buffer );
    gl.bufferData(gl.ARRAY_BUFFER, bg.verts, gl.STATIC_DRAW);
    gl.vertexAttribPointer(
            svars.a_pos, 3, gl.FLOAT, false, 5 * FSIZE, 0);
    gl.enableVertexAttribArray(svars.a_pos);
    gl.vertexAttribPointer(
            svars.a_tex_coord,
            2,
            gl.FLOAT,
            false,
            5 * FSIZE,
            2 * FSIZE);
    gl.enableVertexAttribArray(svars.a_tex_coord);


    return bg;
}
