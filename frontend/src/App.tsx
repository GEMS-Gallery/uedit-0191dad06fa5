import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Container, Typography, List, ListItem, ListItemText, Fab, CircularProgress, TextField, Paper, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import { Editor } from 'react-draft-wysiwyg';
import { EditorState, convertToRaw, convertFromRaw } from 'draft-js';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import { backend } from 'declarations/backend';
import { AuthClient } from '@dfinity/auth-client';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

interface Document {
  id: bigint;
  title: string;
  content: string;
  timestamp: bigint;
}

function App() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [editorState, setEditorState] = useState(EditorState.createEmpty());
  const [loading, setLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authClient, setAuthClient] = useState<AuthClient | null>(null);
  const [userPrincipal, setUserPrincipal] = useState<Principal | null>(null);

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated && userPrincipal) {
      fetchDocuments();
    }
  }, [isAuthenticated, userPrincipal]);

  const initAuth = async () => {
    const client = await AuthClient.create();
    setAuthClient(client);

    const isLoggedIn = await client.isAuthenticated();
    setIsAuthenticated(isLoggedIn);

    if (isLoggedIn) {
      const identity = client.getIdentity();
      const principal = identity.getPrincipal();
      setUserPrincipal(principal);
      const agent = new HttpAgent({ identity });
      Actor.agentOf(backend).replaceIdentity(identity);
    }
  };

  const login = async () => {
    if (authClient) {
      await authClient.login({
        identityProvider: 'https://identity.ic0.app',
        onSuccess: () => {
          setIsAuthenticated(true);
          const identity = authClient.getIdentity();
          const principal = identity.getPrincipal();
          setUserPrincipal(principal);
        },
      });
    }
  };

  const logout = async () => {
    if (authClient) {
      await authClient.logout();
      setIsAuthenticated(false);
      setUserPrincipal(null);
      setDocuments([]);
      setSelectedDocument(null);
    }
  };

  const fetchDocuments = async () => {
    if (!userPrincipal) return;
    setLoading(true);
    try {
      const docs = await backend.getAllDocuments(userPrincipal);
      setDocuments(docs);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
    setLoading(false);
  };

  const createNewDocument = async () => {
    setLoading(true);
    try {
      const id = await backend.createDocument('New Document', '');
      await fetchDocuments();
      const newDoc = { id, title: 'New Document', content: '', timestamp: BigInt(Date.now()) };
      setSelectedDocument(newDoc);
      setEditorState(EditorState.createEmpty());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error creating new document:', error);
    }
    setLoading(false);
  };

  const saveDocument = async () => {
    if (!selectedDocument) return;

    setLoading(true);
    const content = JSON.stringify(convertToRaw(editorState.getCurrentContent()));
    try {
      await backend.updateDocument(selectedDocument.id, selectedDocument.title, content);
      await fetchDocuments();
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error saving document:', error);
    }
    setLoading(false);
  };

  const renameDocumentDebounced = useCallback(
    (id: bigint, newTitle: string) => {
      setLoading(true);
      backend.renameDocument(id, newTitle)
        .then(() => {
          setSelectedDocument((prevDoc) => prevDoc ? { ...prevDoc, title: newTitle } : null);
          return fetchDocuments();
        })
        .catch((error) => {
          console.error('Error renaming document:', error);
        })
        .finally(() => {
          setLoading(false);
        });
    },
    []
  );

  const debouncedRename = useRef<NodeJS.Timeout>();

  const handleRename = (newTitle: string) => {
    if (selectedDocument) {
      if (debouncedRename.current) {
        clearTimeout(debouncedRename.current);
      }
      debouncedRename.current = setTimeout(() => {
        renameDocumentDebounced(selectedDocument.id, newTitle);
      }, 1000);
    }
  };

  const selectDocument = async (doc: Document) => {
    if (!userPrincipal) return;
    setSelectedDocument(doc);
    try {
      const result = await backend.getDocument(doc.id, userPrincipal);
      if ('ok' in result) {
        const content = JSON.parse(result.ok.content);
        setEditorState(EditorState.createWithContent(convertFromRaw(content)));
        setHasUnsavedChanges(false);
      } else {
        console.error('Error fetching document:', result.err);
      }
    } catch (error) {
      console.error('Error selecting document:', error);
      setEditorState(EditorState.createEmpty());
    }
  };

  const handleEditorChange = (newEditorState: EditorState) => {
    setEditorState(newEditorState);
    setHasUnsavedChanges(true);
  };

  if (!isAuthenticated) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Paper sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="h4" gutterBottom>
            Document Editor
          </Typography>
          <Button variant="contained" onClick={login} sx={{ mt: 2 }}>
            Login with Internet Identity
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ height: '100vh', display: 'flex', flexDirection: 'column', pt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="outlined" onClick={logout}>
          Logout
        </Button>
      </Box>
      <Box sx={{ display: 'flex', flexGrow: 1 }}>
        <Paper sx={{ width: '30%', mr: 2, p: 2, overflow: 'auto' }}>
          <Typography variant="h6" gutterBottom>
            Documents
          </Typography>
          {loading ? (
            <CircularProgress />
          ) : (
            <List>
              {documents.map((doc) => (
                <ListItem
                  key={doc.id.toString()}
                  button
                  onClick={() => selectDocument(doc)}
                  selected={selectedDocument?.id === doc.id}
                >
                  <ListItemText primary={doc.title} />
                </ListItem>
              ))}
            </List>
          )}
          <Fab
            color="primary"
            aria-label="add"
            onClick={createNewDocument}
            sx={{ position: 'absolute', bottom: 16, left: 16 }}
          >
            <AddIcon />
          </Fab>
        </Paper>
        <Paper sx={{ width: '70%', p: 2, display: 'flex', flexDirection: 'column' }}>
          {selectedDocument && (
            <>
              <TextField
                value={selectedDocument.title}
                onChange={(e) => {
                  setSelectedDocument({ ...selectedDocument, title: e.target.value });
                  handleRename(e.target.value);
                }}
                variant="outlined"
                fullWidth
                margin="normal"
              />
              <Box sx={{ flexGrow: 1, mt: 2, border: '1px solid #ccc', borderRadius: '4px' }}>
                <Editor
                  editorState={editorState}
                  onEditorStateChange={handleEditorChange}
                  toolbar={{
                    options: ['inline', 'blockType', 'list', 'textAlign', 'link', 'history'],
                    inline: { options: ['bold', 'italic', 'underline'] },
                  }}
                />
              </Box>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={saveDocument}
                disabled={!hasUnsavedChanges || loading}
                sx={{ mt: 2, alignSelf: 'flex-end' }}
              >
                Save
              </Button>
              {hasUnsavedChanges && (
                <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                  *Unsaved changes
                </Typography>
              )}
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
}

export default App;
