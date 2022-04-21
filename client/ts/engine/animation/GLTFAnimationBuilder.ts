import { GLBuffer, GLBufferReadOnly } from "../gl/internal/GLBuffer";
import { GLTFAccessorType, GLTFAnimation, GLTFAnimationChannel, GLTFJson, GLTFSamplerInterpolation, GLTFTargetPathType } from "../loaders/internal/gltfTypes";
import { vec3, quat } from "gl-matrix";
import { LinearVectorSampler } from "nekogirl-valhalla/animation/samplers/LinearVectorSampler";
import { LinearQuatSampler } from "nekogirl-valhalla/animation/samplers/LinearQuatSampler";
import { AnimationSampler } from "nekogirl-valhalla/animation/AnimationSampler";
import { GLTFAnimationManager } from "./internal/GLTFAnimationManager";

export class GLTFAnimationBuilder {
  static buildAnimationManager(data: GLTFJson, anim: GLTFAnimation, buffers: Array<GLBufferReadOnly>) {
    const transformSamplers = new Map<number, AnimationSampler<vec3>>();
    const rotationSamplers = new Map<number, AnimationSampler<quat>>();
    const scaleSamplers = new Map<number, AnimationSampler<vec3>>();

    for (let channel of anim.channels) {
      const sampler = this.convertChannelToSampler(data, anim, channel, buffers);
      // note: this will not work if we need to implement different types
      // workaround: implement different methods for TS and R
      switch (channel.target.path) {
        case GLTFTargetPathType.TRANSLATION:
          if (!(sampler instanceof LinearVectorSampler)) {
            const err = "Translation target must be vec3!";
            throw Error(err);
          }

          transformSamplers.set(channel.target.node, sampler);
          break;
        case GLTFTargetPathType.SCALE:
          if (!(sampler instanceof LinearVectorSampler)) {
            const err = "Scale target must be vec3!";
            throw Error(err);
          }

          scaleSamplers.set(channel.target.node, sampler);
          break;
        case GLTFTargetPathType.ROTATION:
          if (!(sampler instanceof LinearQuatSampler)) {
            const err = "Rotation target must be quat!";
            throw Error(err);
          }

          rotationSamplers.set(channel.target.node, sampler);
      }
    }

    return new GLTFAnimationManager(transformSamplers, rotationSamplers, scaleSamplers);
    
  }

  
  private static convertChannelToSampler(data: GLTFJson, anim: GLTFAnimation, channel: GLTFAnimationChannel, buffers: Array<GLBufferReadOnly>) {
    const samplerIndex = channel.sampler;
    
    
    const sampler = anim.samplers[samplerIndex];
    if (!sampler) {
      const err = `Sampler ${samplerIndex} not found!`;
      throw Error(err);
    }
    // input should always be scalars
    // output should almost always be vec3 or vec4
    
    if (sampler.interpolation !== GLTFSamplerInterpolation.LINEAR) {
      const err = `Cannot currently handle sampler interpolation types other than LINEAR`;
      throw Error(err);
    }
    
    const typeOut = channel.target.path;
    
    const [bufIn, offsetIn, strideIn, countIn, accessorTypeIn] = this.getBufferFromSamplerParameter(data, sampler.input, buffers);
    const [bufOut, offsetOut, strideOut, countOut, accessorTypeOut] = this.getBufferFromSamplerParameter(data, sampler.output, buffers);
    // ensure that the broadcasted output type and the accessor output type agree
    if (((typeOut === GLTFTargetPathType.ROTATION) && accessorTypeOut !== GLTFAccessorType.VEC4) 
      || (typeOut !== GLTFTargetPathType.ROTATION &&  accessorTypeOut !== GLTFAccessorType.VEC3)) {
      const err = `Node type and accessor type for output on channel do not agree -- typeOut ${typeOut}, accessorTypeOut ${accessorTypeOut}`;
      throw Error(err);
    }
    
    if (accessorTypeIn !== GLTFAccessorType.SCALAR) {
      const error = `Expected accessor for input to be of type "SCALAR"`;
      throw Error(error);
    }
    
    switch (sampler.interpolation) {
      case GLTFSamplerInterpolation.LINEAR:
        if (countIn !== countOut) {
          const err = "Expected number of inputs and outputs to be equal!";
          throw Error(err);
        }
        
        if (accessorTypeOut === GLTFAccessorType.VEC3) {
          return this.createLinearSamplerVec3(bufIn, offsetIn, strideIn, bufOut, offsetOut, strideOut, countIn)
        } else {
          return this.createLinearSamplerQuat(bufIn, offsetIn, strideIn, bufOut, offsetOut, strideOut, countIn);
        }
    }
  }

  private static getBufferFromSamplerParameter(data: GLTFJson, accessorIndex: number, buffers: Array<GLBufferReadOnly>) : 
    [GLBufferReadOnly, number, number, number, GLTFAccessorType] {
    if (!data.accessors) {
      const err = "No accessors present on GLTF file!";
      throw Error(err);
    }

    const inputAccessor = data.accessors[accessorIndex];
    if (!inputAccessor) {
      const err = `Referenced accessor ${accessorIndex} in sampler not found!`;
      throw Error(err);
    }

    if (!data.bufferViews) {
      const err = "No buffer views present on GLTF file!";
      throw Error(err);
    }

    const inputBufferView = data.bufferViews[inputAccessor.bufferView];
    if (!inputBufferView) {
      const err = `Referenced buffer view in accessor ${accessorIndex} not found!`;
      throw Error(err);
    }

    const buf = buffers[inputBufferView.buffer];
    if (!buf) {
      const err = `inputBufferView referenced nonexistent buffer ${inputBufferView.buffer}!`;
      throw Error(err);
    }

    const offset = (inputBufferView.byteOffset || 0) + (inputAccessor.byteOffset || 0);
    const stride = inputBufferView.byteStride || 4 * (this.getComponentCount(inputAccessor.type as GLTFAccessorType));

    return [buf, offset, stride, inputAccessor.count, inputAccessor.type as GLTFAccessorType];
  }

  private static getComponentCount(type: GLTFAccessorType) {
    switch (type) {
      case GLTFAccessorType.SCALAR:
      return 1;
    case GLTFAccessorType.VEC3:
      return 3;
    case GLTFAccessorType.VEC4:
      return 4;
      default:
        console.warn("!!!!!!")
        return 0;
    }
  }

  private static createLinearSamplerVec3(bufIn: GLBufferReadOnly, offsetIn: number, strideIn: number, bufOut: GLBufferReadOnly, offsetOut: number, strideOut: number, count: number) {
    const output = new LinearVectorSampler<vec3>();
    for (let i = 0; i < count; i++) {
      const sampleTime = bufIn.getFloat32(offsetIn + strideIn * i, true);
      const sampleVal  = bufOut.getFloat32Array(offsetOut + strideOut * i, 3) as vec3;
      output.insert(sampleTime, sampleVal);
    }

    return output;
  }

  private static createLinearSamplerQuat(bufIn: GLBufferReadOnly, offsetIn: number, strideIn: number, bufOut: GLBufferReadOnly, offsetOut: number, strideOut: number, count: number) {
    const output = new LinearQuatSampler();
    for (let i = 0; i < count; i++) {
      const sampleTime = bufIn.getFloat32(offsetIn + strideIn * i, true);
      const sampleVal  = bufOut.getFloat32Array(offsetOut + strideOut * i, 4) as quat;
      output.insert(sampleTime, sampleVal);
    }

    return output;
  }
}