import { addSideEffect } from '@babel/helper-module-imports'

const elementToComponent = {
  svg: 'Svg',
  circle: 'Circle',
  clipPath: 'ClipPath',
  ellipse: 'Ellipse',
  g: 'G',
  linearGradient: 'LinearGradient',
  radialGradient: 'RadialGradient',
  line: 'Line',
  path: 'Path',
  pattern: 'Pattern',
  polygon: 'Polygon',
  polyline: 'Polyline',
  rect: 'Rect',
  symbol: 'Symbol',
  text: 'Text',
  textPath: 'TextPath',
  tspan: 'TSpan',
  use: 'Use',
  defs: 'Defs',
  stop: 'Stop',
  mask: 'Mask',
  image: 'Image',
}

const isReactNativeSvg = (path) =>
  path.get('source').isStringLiteral({ value: 'react-native-svg' })

const plugin = ({ types: t }) => {
  function replaceElement(path, state) {
    const { name } = path.node.openingElement.name
    console.log(`Replacing ${name}`)

    // Replace element by react-native-svg components
    const component = elementToComponent[name]

    if (component) {
      const openingElementName = path.get('openingElement.name')
      openingElementName.replaceWith(t.jsxIdentifier(component))
      if (path.has('closingElement')) {
        const closingElementName = path.get('closingElement.name')
        closingElementName.replaceWith(t.jsxIdentifier(component))
      }
      state.replacedComponents.add(component)
      return
    }

    // Remove element if not supported
    state.unsupportedComponents.add(name)
    path.remove()
  }

  const svgElementVisitor = {
    JSXElement(path, state) {
      // There are two valid opening elements:

      // 1. `svg`
      if (path.get('openingElement.name').isJSXIdentifier({ name: 'svg' })) {
        replaceElement(path, state)
        path.traverse(jsxElementVisitor, state)
        return
      }

      // 2. `IconRoot`
      if (
        path.get('openingElement.name').isJSXIdentifier({ name: 'IconRoot' })
      ) {
        path.traverse(jsxElementVisitor, state)
        return
      }
    },
  }

  const jsxElementVisitor = {
    JSXElement(path, state) {
      replaceElement(path, state)
    },
  }

  const importDeclarationVisitor = {
    ImportDeclaration(path, state) {
      if (!isReactNativeSvg(path)) {
        return
      }

      state.replacedComponents.forEach((component) => {
        if (
          path
            .get('specifiers')
            .some((specifier) =>
              specifier.get('local').isIdentifier({ name: component })
            )
        ) {
          return
        }

        path.pushContainer(
          'specifiers',
          t.importSpecifier(t.identifier(component), t.identifier(component))
        )
      })

      if (state.unsupportedComponents.size && !path.has('trailingComments')) {
        const componentList = [...state.unsupportedComponents].join(', ')
        path.addComment(
          'trailing',
          ` SVGR has dropped some elements not supported by react-native-svg: ${componentList} `
        )
      }
    },
  }

  return {
    visitor: {
      Program(path, state) {
        state.replacedComponents = new Set()
        state.unsupportedComponents = new Set()

        path.traverse(svgElementVisitor, state)

        if (
          state.replacedComponents.size > 0 &&
          !path.get('body').some((body) => isReactNativeSvg(body))
        ) {
          addSideEffect(path, 'react-native-svg')
        }

        path.traverse(importDeclarationVisitor, state)
      },
    },
  }
}

export default plugin
