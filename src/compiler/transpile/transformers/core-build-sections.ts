import { CoreBuild } from '../../../util/interfaces';
import * as ts from 'typescript';


export function coreBuildTransform(coreBuild: CoreBuild): ts.TransformerFactory<ts.SourceFile> {

  return (transformContext) => {
    function visitIdentifier(node: ts.Identifier) {
      if (!node.parent || node.parent.kind === ts.SyntaxKind.VariableDeclaration) {
        return node;
      }

      const variableName = node.getText();

      if (!variableName.startsWith('$build_')) {
        // not a $build_ identifier (almost everything)
        return node;
      }

      // ok, this is a $build variable
      // turn the variable into a boolean
      // which will let the build tools remove unusable code
      // for example:  if (false) is impossible, so uglify will cut out the code
      (node.escapedText as any) = (!!(coreBuild as any)[variableName]).toString();

      return ts.updateIdentifier(node, null);
    }

    function visit(node: ts.Node): ts.VisitResult<ts.Node> {
      switch (node.kind) {
        case ts.SyntaxKind.Identifier:
          return visitIdentifier(node as ts.Identifier);

        default:
          return ts.visitEachChild(node, (node) => {
            return visit(node);
          }, transformContext);
      }
    }

    return (tsSourceFile) => {
      return visit(tsSourceFile) as ts.SourceFile;
    };
  };
}
