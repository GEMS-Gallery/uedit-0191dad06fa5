import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Container, Typography, List, ListItem, ListItemText, Fab, CircularProgress, TextField, Paper, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import { Editor } from 'react-draft-wysiwyg';
import { EditorState, convertToRaw, convertFromRaw } from 'draft-js';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import { backend } from 'declarations/backend';

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

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const docs = await backend.getAllDocuments();
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
    setSelectedDocument(doc);
    try {
      const content = JSON.parse(doc.content);
      setEditorState(EditorState.createWithContent(convertFromRaw(content)));
      setHasUnsavedChanges(false);
    } catch {
      setEditorState(EditorState.createEmpty());
    }
  };

  const handleEditorChange = (newEditorState: EditorState) => {
    setEditorState(newEditorState);
    setHasUnsavedChanges(true);
  };

  return (
    <Container maxWidth="lg" sx={{ height: '100vh', display: 'flex', flexDirection: 'column', pt: 2 }}>
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
