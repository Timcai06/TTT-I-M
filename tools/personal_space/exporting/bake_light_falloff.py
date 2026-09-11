"""three r182's finite inverse-square light attenuation, applied in Cycles."""
def finite_falloff(light, distance):
    color=tuple(light.color)
    light.color=(1,1,1);light.use_nodes=True
    nodes,links=light.node_tree.nodes,light.node_tree.links;nodes.clear()
    output=nodes.new('ShaderNodeOutputLight');emit=nodes.new('ShaderNodeEmission')
    emit.inputs['Color'].default_value=(*color,1)
    ray=nodes.new('ShaderNodeLightPath')
    divide=nodes.new('ShaderNodeMath');divide.operation='DIVIDE';divide.inputs[1].default_value=distance
    power=nodes.new('ShaderNodeMath');power.operation='POWER';power.inputs[1].default_value=4
    invert=nodes.new('ShaderNodeMath');invert.operation='SUBTRACT';invert.inputs[0].default_value=1;invert.use_clamp=True
    square=nodes.new('ShaderNodeMath');square.operation='MULTIPLY'
    links.new(ray.outputs['Ray Length'],divide.inputs[0]);links.new(divide.outputs[0],power.inputs[0]);links.new(power.outputs[0],invert.inputs[1])
    links.new(invert.outputs[0],square.inputs[0]);links.new(invert.outputs[0],square.inputs[1]);links.new(square.outputs[0],emit.inputs['Strength'])
    links.new(emit.outputs[0],output.inputs['Surface'])
