export function loadFreshModule<Module>(load: () => Module): Module {
  const loaded: Module[] = [];

  jest.isolateModules(() => {
    loaded.push(load());
  });

  return loaded[0];
}
