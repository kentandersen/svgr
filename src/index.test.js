import { expect } from 'chai'
import { transform } from '@babel/core'
import plugin from '.'

const testPlugin = (code, options) => {
  const result = transform(code, {
    plugins: ['@babel/plugin-syntax-jsx', [plugin, options]],
    configFile: false,
  })

  return result
}

describe('plugin', () => {
  it('should transform elements', () => {
    const { code } = testPlugin('<svg></svg>')
    expect(code).to.equal(
      `import { Svg } from "react-native-svg";
<Svg></Svg>;`
    )
  })

  it('should transform elements with IconRoot', () => {
    const { code } = testPlugin('<IconRoot><path /></IconRoot>')
    expect(code).to.equal(
      `import { Path } from "react-native-svg";
<IconRoot><Path /></IconRoot>;`
    )
  })

  it('should not add multiple react-native-svg imports', () => {
    const { code } = testPlugin(
      `import "react-native-svg";
      <svg></svg>;`
    )
    expect(code).to.equal(
      `import { Svg } from "react-native-svg";
<Svg></Svg>;`
    )
  })
  it('should add to import', () => {
    const { code } = testPlugin('<svg><g /></svg>;')
    expect(code).to.equal(
      `import { Svg, G } from "react-native-svg";
<Svg><G /></Svg>;`
    )
  })

  it('should add warning of dropped elements', () => {
    const { code } = testPlugin(
      `import Svg from 'react-native-svg';
<svg><g /><div /></svg>;`
    )

    expect(code).to.equal(
      `import Svg, { G } from 'react-native-svg';
/* SVGR has dropped some elements not supported by react-native-svg: div */

<Svg><G /></Svg>;`
    )
  })
})
