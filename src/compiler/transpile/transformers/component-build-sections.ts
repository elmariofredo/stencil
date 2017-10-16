import { BuildContext, CoreBuild } from '../../../util/interfaces';
import * as ts from 'typescript';


export function loadComponentBuildSections(ctx: BuildContext, classNode: ts.ClassDeclaration) {
  const coreBuild = ctx.coreBuild;

  classNode.members.forEach(memberNode => {
    memberNode.forEachChild(memberNodeChild => {
      if (memberNodeChild.kind === ts.SyntaxKind.Identifier) {
        setBuildSectionFromMembers(coreBuild, memberNodeChild.getText());
      }
    });
  });

  if (!coreBuild.$build_svg_render) {
    const classText = classNode.getText().toLowerCase();
    // if any class contains the text "svg" anywhere
    // then let's enable the svg sections of the renderer
    coreBuild.$build_svg_render = (classText.indexOf('svg') > -1);
  }
}


export function setBuildSectionFromMembers(coreBuild: CoreBuild, memberName: string) {
  switch (memberName) {
    case 'componentWillLoad':
      coreBuild.$build_will_load = true;
      return;

    case 'componentDidLoad':
      coreBuild.$build_did_load = true;
      return;

    case 'componentWillUpdate':
      coreBuild.$build_will_update = true;
      return;

    case 'componentDidUpdate':
      coreBuild.$build_did_update = true;
      return;

    case 'componentWillUnload':
      coreBuild.$build_will_unload = true;
      return;

    case 'componentDidUnload':
      coreBuild.$build_did_unload = true;
      return;

    case 'hostData':
      coreBuild.$build_host_render = true;
      return;

    case 'render':
      coreBuild.$build_render = true;
      return;
  }
}
