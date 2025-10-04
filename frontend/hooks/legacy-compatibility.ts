// Stub file - Legacy Compatibility
export const useLegacyCompatibility = () => {
  return {
    isLegacyMode: false,
    convertData: (data: any) => data,
  };
};

export default useLegacyCompatibility;
