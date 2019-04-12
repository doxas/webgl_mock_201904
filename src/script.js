
import vs from './shader/main.vert';
import fs from './shader/main.frag';

export default class WebGLFrame {
    static get VERSION(){return 'v0.0.1';}
    constructor(){
        console.log(WebGLFrame.VERSION);
        console.log(vs, fs);
    }
}

window.WebGLFrame = WebGLFrame;

