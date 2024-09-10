import Hash "mo:base/Hash";
import Iter "mo:base/Iter";

import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Array "mo:base/Array";
import HashMap "mo:base/HashMap";
import Time "mo:base/Time";
import Result "mo:base/Result";

actor {
  type Document = {
    id: Nat;
    title: Text;
    content: Text;
    timestamp: Time.Time;
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

  public func createDocument(title : Text, content : Text) : async Nat {
    let id = nextId;
    let document : Document = {
      id = id;
      title = title;
      content = content;
      timestamp = Time.now();
    };
    documentMap.put(id, document);
    nextId += 1;
    id
  };

  public func updateDocument(id : Nat, title : Text, content : Text) : async Result.Result<(), Text> {
    switch (documentMap.get(id)) {
      case (null) {
        #err("Document not found")
      };
      case (?existingDoc) {
        let updatedDoc : Document = {
          id = id;
          title = title;
          content = content;
          timestamp = Time.now();
        };
        documentMap.put(id, updatedDoc);
        #ok()
      };
    }
  };

  public func renameDocument(id : Nat, newTitle : Text) : async Result.Result<(), Text> {
    switch (documentMap.get(id)) {
      case (null) {
        #err("Document not found")
      };
      case (?existingDoc) {
        let updatedDoc : Document = {
          id = id;
          title = newTitle;
          content = existingDoc.content;
          timestamp = Time.now();
        };
        documentMap.put(id, updatedDoc);
        #ok()
      };
    }
  };

  public query func getDocument(id : Nat) : async ?Document {
    documentMap.get(id)
  };

  public query func getAllDocuments() : async [Document] {
    Iter.toArray(documentMap.vals())
  };

  public func deleteDocument(id : Nat) : async Result.Result<(), Text> {
    switch (documentMap.remove(id)) {
      case (null) {
        #err("Document not found")
      };
      case (?_) {
        #ok()
      };
    }
  };
}
