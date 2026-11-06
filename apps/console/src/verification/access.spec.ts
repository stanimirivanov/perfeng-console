import { VerificationAccess } from "./access";

afterEach(() => vi.unstubAllGlobals());

it("a late grant cannot undo a subsequent denial", async () => {
  let grant!: (response: Response) => void;
  const pending = new Promise<Response>(resolve => { grant = resolve; });
  vi.stubGlobal("fetch", vi.fn().mockReturnValueOnce(pending)
    .mockResolvedValueOnce(new Response(null, { status: 403 })));
  const access = new VerificationAccess();
  const older = access.refresh();
  expect(await access.refresh()).toBe(false);
  grant(new Response(null, { status: 204 }));
  expect(await older).toBe(false);
  expect(access.granted()).toBe(false);
});

it("unexpected HTML success and network errors never disclose Verification", async () => {
  vi.stubGlobal("fetch", vi.fn()
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(new Response("<html>preview</html>", { status: 200 }))
    .mockRejectedValueOnce(new TypeError("offline")));
  const access = new VerificationAccess();
  expect(await access.refresh()).toBe(true);
  expect(await access.refresh()).toBe(false);
  expect(await access.refresh()).toBe(false);
  expect(access.granted()).toBe(false);
});
