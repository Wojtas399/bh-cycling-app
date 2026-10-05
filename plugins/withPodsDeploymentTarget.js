const { withDangerousMod } = require('expo/config-plugins');
const {
  mergeContents,
} = require('@expo/config-plugins/build/utils/generateCode');
const fs = require('fs');
const path = require('path');

/**
 * Raises every pod's iOS deployment target to at least `minimum`.
 *
 * Several pods (Firebase, gRPC, Google Sign-In — mostly their `*_Privacy`
 * resource bundles) still declare 9.0–12.0. Xcode 27 only supports 15.0+ and
 * fails the build on anything lower, and React Native's own post-install hook
 * doesn't touch those targets.
 */
module.exports = function withPodsDeploymentTarget(config, minimum = '15.1') {
  return withDangerousMod(config, [
    'ios',
    async config => {
      const podfile = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile',
      );
      const contents = fs.readFileSync(podfile, 'utf8');

      const result = mergeContents({
        tag: 'with-pods-deployment-target',
        src: contents,
        newSrc: [
          '    installer.pods_project.targets.each do |target|',
          '      target.build_configurations.each do |build_config|',
          `        if build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < ${minimum}`,
          `          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${minimum}'`,
          '        end',
          '      end',
          '    end',
        ].join('\n'),
        anchor: /post_install do \|installer\|/,
        offset: 1,
        comment: '#',
      });

      fs.writeFileSync(podfile, result.contents);

      return config;
    },
  ]);
};
