/**Converts a 32-bit RGBA value to the percentages used by WebGL for colors.
 * @param R, Red 0-255
 * @param G, Green 0-255
 * @param B, Blue 0-255
 * @param A, Alpha 0-255
 */
function rgba32( R, G, B, A )
{
    if( R > 255 ) R = 255;
    if( R < 0 )   R = 0;
    if( G > 255 ) G = 255;
    if( G < 0 )   G = 0;
    if( B > 255 ) B = 255;
    if( B < 0 )   B = 0;
    if( A > 255 ) A = 255;
    if( A < 0 )   A = 0;

    return new Float32Array
        ([ R/255, G/255, B/255, A/255 ]);
}

