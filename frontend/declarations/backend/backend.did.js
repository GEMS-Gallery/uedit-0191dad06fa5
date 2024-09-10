export const idlFactory = ({ IDL }) => {
  const Result = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  const Time = IDL.Int;
  const Document = IDL.Record({
    'id' : IDL.Nat,
    'title' : IDL.Text,
    'content' : IDL.Text,
    'owner' : IDL.Principal,
    'timestamp' : Time,
  });
  const Result_1 = IDL.Variant({ 'ok' : Document, 'err' : IDL.Text });
  return IDL.Service({
    'createDocument' : IDL.Func([IDL.Text, IDL.Text], [IDL.Nat], []),
    'deleteDocument' : IDL.Func([IDL.Nat], [Result], []),
    'getAllDocuments' : IDL.Func(
        [IDL.Principal],
        [IDL.Vec(Document)],
        ['query'],
      ),
    'getDocument' : IDL.Func([IDL.Nat, IDL.Principal], [Result_1], ['query']),
    'renameDocument' : IDL.Func([IDL.Nat, IDL.Text], [Result], []),
    'updateDocument' : IDL.Func([IDL.Nat, IDL.Text, IDL.Text], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
