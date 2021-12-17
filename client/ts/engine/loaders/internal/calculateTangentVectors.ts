import { vec2, vec3 } from "gl-matrix";
import { GameContext } from "../../GameContext";
import { GLAttributeImpl } from "../../gl/internal/GLAttributeImpl";
import { GLBufferImpl } from "../../gl/internal/GLBufferImpl";
import { ModelInstance } from "./ModelImpl";

function calculateTangentVectors(inst: ModelInstance, ctx: GameContext) {
  const pos = inst.positions;
  const tex = inst.texcoords;
  const ind = inst.indices;
  const norm = inst.normals;

  if (!tex || !norm) {
    // texcoord required for proper eval
    return null;
  }

  const vertCount = pos.count;
  const tangent: Array<vec3> = new Array(vertCount);
  const bitangent: Array<vec3> = new Array(vertCount);

  for (let i = 0; i < vertCount; i++) {
    tangent[i] = vec3.zero(vec3.create());
    bitangent[i] = vec3.zero(vec3.create());
  }

  for (let i = 0; i < ind.count; i += 3) {
    const posA = pos.get(ind.getIndex(i)) as vec3;
    const posB = pos.get(ind.getIndex(i + 1)) as vec3;
    const posC = pos.get(ind.getIndex(i + 2)) as vec3;
    const texA = pos.get(ind.getIndex(i)) as vec2;
    const texB = pos.get(ind.getIndex(i + 1)) as vec2;
    const texC = pos.get(ind.getIndex(i + 2)) as vec2;

    const texAB = vec2.sub(vec2.create(), texB, texA);
    const texAC = vec2.sub(vec2.create(), texC, texA);
    
    const posAB = vec3.sub(vec3.create(), posB, posA);
    const posAC = vec3.sub(vec3.create(), posC, posA);

    const det = (texAB[0] * texAC[1] - texAB[1] * texAC[0]);
    const invDet = 1 / det;

    const tan = vec3.create();
    const bitan = vec3.create();

    for (let j = 0; j < 3; j++) {
      tan[j] = (texAC[1] * posAB[j] - texAB[1] * posAC[j]) * invDet;
      bitan[j] = (texAB[0] * posAC[j] - texAC[0] * posAB[j]);
    }

    for (let j = 0; j < 3; j++) {
      const index = ind.getIndex(i + j);
      vec3.add(tangent[index], tangent[index], tan);
      vec3.add(bitangent[index], bitangent[index], bitan);
    }
  }

  for (let i = 0; i < vertCount; i++) {
    const normal = norm.get(i) as vec3;
    const tan = tangent[i];

    // project tangent onto normal
    const proj = vec3.scale(normal, normal, vec3.dot(normal, tan));
    // subtract normal component from tangent, so that they're linearly independent
    vec3.sub(tan, tan, proj);
    vec3.normalize(tan, tan);

    // safeguard
    
    // calculate bitangent, and compare it to the one we calculated from texcoords
    const hand = vec3.dot(vec3.cross(vec3.create(), normal, tan), bitangent[i]);

    if (hand < 0) {
      // tangent got flipped somewhere along the way!
      vec3.scale(tan, tan, -1);
    }

    tangent[i] = tan;
  }

  const buf = new GLBufferImpl(ctx);
  for (let i = 0; i < vertCount; i++) {
    buf.setFloatArray(i * 12, tangent[i], true);
  }

  // write a test for this
  // load some models, run them through this, compare the results!
  return GLAttributeImpl.createFromValues(buf, 3, ctx.getGLContext().FLOAT, vertCount, 0, 0);
}