
import baseVs from './shader/base.vert';
import baseFs from './shader/base.frag';
import noiseVs from './shader/noise.vert';
import noiseFs from './shader/noise.frag';

import glcubic from './gl3Core.js';

// variable ===============================================================
let gl3, gl, run, mat4, qtn, count, nowTime, framebuffer;
let canvas, canvasWidth, canvasHeight;
let audio;

// shader
let basePrg, noisePrg;

export default class WebGLFrame {
    static get VERSION(){return 'v0.0.1';}
    constructor(){
        gl3 = new glcubic();
        gl3.init(
            document.getElementById('webgl'),
            null,
            {
                webgl2Mode: true,
                consoleMessage: true
            }
        );
        if(!gl3.ready){
            console.log('initialize error');
            return;
        }
        run           = true;
        canvas        = gl3.canvas;
        gl            = gl3.gl;
        mat4          = gl3.Math.Mat4;
        qtn           = gl3.Math.Qtn;
        canvasWidth   = window.innerWidth;
        canvasHeight  = window.innerHeight;
        canvas.width  = canvasWidth;
        canvas.height = canvasHeight;

        this.eventSetting();

        this.debugSetting();

        audio = new gl3.Audio(0.5, 0.5);
        // audio.load('sound/amairo.mp3', 0, true, true, () => {
            gl3.createTextureFromFile('./resource/snoise.png', 0, () => {
                this.shaderLoader();
                this.init();
            });
        // });
    }

    eventSetting(){
        window.addEventListener('keydown', (evt) => {
            if(evt.keyCode === 27){
                run = false;
                if(audio != null && audio.src[0] != null && audio.src[0].loaded){
                    audio.src[0].stop();
                }
            }
        }, false);
        window.addEventListener('resize', () => {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, null);
            gl3.deleteFramebuffer(framebuffer);
            canvasWidth = window.innerWidth;
            canvasHeight = window.innerHeight;
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            framebuffer = gl3.createFramebuffer(canvasWidth, canvasHeight, 1);
            gl.bindTexture(gl.TEXTURE_2D, framebuffer.texture);
        }, false);
    }

    debugSetting(){
        let wrapper = new gl3.Gui.Wrapper();
        document.body.appendChild(wrapper.getElement());

        let slider = new gl3.Gui.Slider('test', 50, 0, 100, 1);
        slider.add('input', (evt, self) => {console.log(self.getValue());});
        wrapper.append(slider.getElement());

        let check = new gl3.Gui.Checkbox('hoge', false);
        check.add('change', (evt, self) => {console.log(self.getValue());});
        wrapper.append(check.getElement());

        let radio0 = new gl3.Gui.Radio('hoge', null, false);
        let radio1 = new gl3.Gui.Radio('fuga', null, false);
        radio0.add('change', (evt, self) => {console.log(self.getValue());});
        radio1.add('change', (evt, self) => {console.log(self.getValue());});
        wrapper.append(radio0.getElement());
        wrapper.append(radio1.getElement());

        let select = new gl3.Gui.Select('fuga', ['foo', 'baa'], 0);
        select.add('change', (evt, self) => {console.log(self.getValue());});
        wrapper.append(select.getElement());

        let spin = new gl3.Gui.Spin('hoge', 0.0, -1.0, 1.0, 0.1);
        spin.add('input', (evt, self) => {console.log(self.getValue());});
        wrapper.append(spin.getElement());

        let color = new gl3.Gui.Color('fuga', '#ff0000');
        color.add('change', (evt, self) => {console.log(self.getValue(), self.getFloatValue());});
        wrapper.append(color.getElement());
    }

    shaderLoader(){
        // base texture program
        basePrg = gl3.createProgramFromSource(
            baseVs,
            baseFs,
            ['position', 'normal', 'color', 'texCoord'],
            [3, 3, 4, 2],
            ['mMatrix', 'mvpMatrix', 'normalMatrix', 'eyePosition', 'lightPosition', 'ambient', 'texture'],
            ['matrix4fv', 'matrix4fv', 'matrix4fv', '3fv', '3fv', '3fv', '1i'],
        );
        // noise texture program
        noisePrg = gl3.createProgramFromSource(
            noiseVs,
            noiseFs,
            ['position'],
            [3],
            ['textureUnit', 'resolution', 'time'],
            ['1i', '2fv', '1f'],
        );
        this.init();
    }

    init(){
        // torus
        let torusData = gl3.Mesh.torus(64, 64, 0.3, 0.7, [1.0, 1.0, 1.0, 1.0]);
        let torusVBO = [
            gl3.createVbo(torusData.position),
            gl3.createVbo(torusData.normal),
            gl3.createVbo(torusData.color),
            gl3.createVbo(torusData.texCoord)
        ];
        let torusIBO = gl3.createIbo(torusData.index);

        // icosahedron
        let icosaData = gl3.Mesh.icosahedron(1.0, [1.0, 1.0, 1.0, 1.0]);
        let icosaVBO = [
            gl3.createVbo(icosaData.position),
            gl3.createVbo(icosaData.normal),
            gl3.createVbo(icosaData.color),
            gl3.createVbo(icosaData.texCoord)
        ];
        let icosaIBO = gl3.createIbo(icosaData.index);

        // plane
        let planePosition = [
            -1.0,  1.0,  0.0,
             1.0,  1.0,  0.0,
            -1.0, -1.0,  0.0,
             1.0, -1.0,  0.0
        ];
        let planeIndex = [
            0, 2, 1,
            1, 2, 3
        ];
        let planeVBO = [
            gl3.createVbo(planePosition)
        ];
        let planeIBO = gl3.createIbo(planeIndex);

        // matrix
        let mMatrix      = mat4.identity(mat4.create());
        let vMatrix      = mat4.identity(mat4.create());
        let pMatrix      = mat4.identity(mat4.create());
        let vpMatrix     = mat4.identity(mat4.create());
        let mvpMatrix    = mat4.identity(mat4.create());
        let normalMatrix = mat4.identity(mat4.create());
        let invMatrix    = mat4.identity(mat4.create());

        // framebuffer
        framebuffer = gl3.createFramebuffer(canvasWidth, canvasHeight, 1);

        // texture
        gl3.textures.map((v, i) => {
            if(v != null && v.texture != null){
                gl.activeTexture(gl.TEXTURE0 + i);
                gl.bindTexture(gl.TEXTURE_2D, v.texture);
            }
        });

        // gl flags
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);

        // variables
        let beginTime = Date.now();
        let nowTime = 0;
        let cameraPosition = [0.0, 0.0, 5.0];
        let centerPoint    = [0.0, 0.0, 0.0];
        let upDirection    = [0.0, 1.0, 0.0];
        let lightPosition  = [2.0, 3.0, 4.0];
        let ambientColor   = [0.1, 0.1, 0.1];
        let targetTexture  = 0;

        // audio
        // audio.src[0].play();

        // rendering
        render();
        function render(){
            nowTime = Date.now() - beginTime;
            nowTime /= 1000;
            count++;

            // animation
            if(run){
                requestAnimationFrame(render);
            }else{
                clean();
                return;
            }

            // canvas
            canvasWidth   = window.innerWidth;
            canvasHeight  = window.innerHeight;
            canvas.width  = canvasWidth;
            canvas.height = canvasHeight;

            // view x proj
            mat4.vpFromCameraProperty(
                cameraPosition,
                centerPoint,
                upDirection,
                60,
                canvasWidth / canvasHeight,
                0.1,
                10.0,
                vMatrix, pMatrix, vpMatrix
            );

            // render to framebuffer ==========================================
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer.framebuffer);
            gl3.sceneView(0, 0, canvasWidth, canvasHeight);
            gl3.sceneClear([0.3, 0.3, 0.4, 1.0], 1.0);

            // program
            basePrg.useProgram();
            basePrg.setAttribute(icosaVBO, icosaIBO);
            // basePrg.setAttribute(torusVBO, torusIBO);

            // model and draw
            mat4.identity(mMatrix);
            mat4.translate(mMatrix, [0.0, 0.0, Math.sin(nowTime) * 0.25], mMatrix);
            mat4.rotate(mMatrix, nowTime, [1.0, 1.0, 1.0], mMatrix);
            mat4.multiply(vpMatrix, mMatrix, mvpMatrix);
            mat4.inverse(mMatrix, invMatrix);
            mat4.transpose(invMatrix, normalMatrix);
            basePrg.pushShader([
                mMatrix,
                mvpMatrix,
                normalMatrix,
                cameraPosition,
                lightPosition,
                ambientColor,
                targetTexture
            ]);
            gl3.drawElements(gl.TRIANGLES, icosaData.index.length);
            // gl3.drawElements(gl.TRIANGLES, torusData.index.length);

            // render to canvas
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl3.sceneView(0, 0, canvasWidth, canvasHeight);
            gl3.sceneClear([0.0, 0.0, 0.0, 1.0], 1.0);

            // program
            noisePrg.useProgram();
            noisePrg.setAttribute(planeVBO, planeIBO);
            noisePrg.pushShader([1, [canvasWidth, canvasHeight], nowTime]);
            gl3.drawElements(gl.TRIANGLES, planeIndex.length);

            // final
            gl.flush();
        }

        function clean(){
            torusVBO.map((v) => {
                gl3.deleteBuffer(v);
            });
            gl3.deleteBuffer(torusIBO);
            planeVBO.map((v) => {
                gl3.deleteBuffer(v);
            });
            gl3.deleteBuffer(planeIBO);
            gl3.deleteFramebuffer(framebuffer);
            gl3.textures.map((v) => {
                if(v == null || v.texture == null){return;}
                gl3.deleteTexture(v.texture);
            });
        }
    }
}

window.WebGLFrame = WebGLFrame;

