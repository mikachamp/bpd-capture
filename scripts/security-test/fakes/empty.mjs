// Stand-in for native modules the tests never call (gallery access).
export const requestPermissionsAsync = async () => ({ granted: false });
export const createAssetAsync = async () => null;
export const getAlbumAsync = async () => null;
export const createAlbumAsync = async () => null;
export const addAssetsToAlbumAsync = async () => null;
export default {};
