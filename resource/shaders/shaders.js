"use strict";

/**Creates an array of shaders.
 * @return an array contain the necessary shader programs.
 */
function get_shaders()
{
    var shaders = [
        'attribute vec4 a_pos;\n' +
        'uniform mat4 u_xform;\n' +
        'void main(){\n' +
        '  gl_Position = u_xform * a_pos;\n' +
        '}\n'
        ,

        //un-textured items
        'precision mediump float;\n' +
        'uniform vec4 u_color;\n' +
        'void main(){\n' +
        '  gl_FragColor = u_color;\n' +
        '}\n'
        ,
        
        //text items
        'attribute vec4 a_pos;\n' +
        'attribute vec2 a_tex_coord;\n' +
        'uniform mat4 u_xform;\n' +
        'varying vec2 v_tex_coord;\n' +
        'void main(){\n' +
        '  gl_Position = u_xform * a_pos;\n' +
        '  v_tex_coord = a_tex_coord;\n' +
        '}\n'
        ,

        'precision mediump float;\n' +
        'uniform sampler2D u_sampler;\n' +
        'varying vec2 v_tex_coord;\n' +
        'void main(){\n' +
        '  gl_FragColor = texture2D(u_sampler, v_tex_coord);\n' +
        '}\n'
    ]

    return shaders;
}
