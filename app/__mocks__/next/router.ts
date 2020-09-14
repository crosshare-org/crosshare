const NextJSRouter = { push: jest.fn() };
export default NextJSRouter;

export function useRouter() {
  return {
    events: {
      on: () => null,
      off: () => null,
      emit: () => null
    }
  };
}
