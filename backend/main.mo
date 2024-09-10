import Bool "mo:base/Bool";
import Hash "mo:base/Hash";

import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Array "mo:base/Array";
import HashMap "mo:base/HashMap";
import Time "mo:base/Time";
import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Iter "mo:base/Iter";

actor {
  type Document = {
    id: Nat;
    title: Text;
    content: Text;
    timestamp: Time.Time;
    owner: Principal;
  };

  stable var documents : [(Nat, Document)] = [];
  var documentMap = HashMap.HashMap<Nat, Document>(0, Nat.equal, Nat.hash);
  var nextId : Nat = 0;

  system func preupgrade() {
    documents := Iter.toArray(documentMap.entries());
  };

  system func postupgrade() {
    documentMap := HashMap.fromIter<Nat, Document>(documents.vals(), documents.size(), Nat.equal, Nat.hash);
    nextId := documents.size();
  };

  public shared(msg) func createDocument(title : Text, content : Text) : async Nat {
    let id = nextId;
    let document : Document = {
      id = id;
      title = title;
      content = content;
      timestamp = Time.now();
      owner = msg.caller;
    };
    documentMap.put(id, document);
    nextId += 1;
    id
  };

  public shared(msg) func updateDocument(id : Nat, title : Text, content : Text) : async Result.Result<(), Text> {
    switch (documentMap.get(id)) {
      case (null) {
        #err("Document not found")
      };
      case (?existingDoc) {
        if (existingDoc.owner != msg.caller) {
          return #err("Unauthorized");
        };
        let updatedDoc : Document = {
          id = id;
          title = title;
          content = content;
          timestamp = Time.now();
          owner = msg.caller;
        };
        documentMap.put(id, updatedDoc);
        #ok()
      };
    }
  };

  public shared(msg) func renameDocument(id : Nat, newTitle : Text) : async Result.Result<(), Text> {
    switch (documentMap.get(id)) {
      case (null) {
        #err("Document not found")
      };
      case (?existingDoc) {
        if (existingDoc.owner != msg.caller) {
          return #err("Unauthorized");
        };
        let updatedDoc : Document = {
          id = id;
          title = newTitle;
          content = existingDoc.content;
          timestamp = Time.now();
          owner = msg.caller;
        };
        documentMap.put(id, updatedDoc);
        #ok()
      };
    }
  };

  public query func getDocument(id : Nat, caller : Principal) : async Result.Result<Document, Text> {
    switch (documentMap.get(id)) {
      case (null) {
        #err("Document not found")
      };
      case (?doc) {
        if (doc.owner != caller) {
          return #err("Unauthorized");
        };
        #ok(doc)
      };
    }
  };

  public query func getAllDocuments(caller : Principal) : async [Document] {
    Iter.toArray(Iter.filter(documentMap.vals(), func (doc: Document) : Bool { doc.owner == caller }))
  };

  public shared(msg) func deleteDocument(id : Nat) : async Result.Result<(), Text> {
    switch (documentMap.get(id)) {
      case (null) {
        #err("Document not found")
      };
      case (?doc) {
        if (doc.owner != msg.caller) {
          return #err("Unauthorized");
        };
        ignore documentMap.remove(id);
        #ok()
      };
    }
  };
}
