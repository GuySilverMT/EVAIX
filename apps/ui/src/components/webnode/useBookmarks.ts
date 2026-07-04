/**
 * @file useBookmarks.ts
 * @description Custom hook for bookmark operations
 */

import { useState } from 'react';
import { trpc } from '../../utils/trpc';
import { toast } from 'sonner';
import { BookmarkFolder } from './types';

export function useBookmarks() {
  const utils = trpc.useContext();
  const { data: folders } = trpc.bookmark.listFolders.useQuery();
  
  const [showBookmarkPopover, setShowBookmarkPopover] = useState(false);
  const [bookmarkTitle, setBookmarkTitle] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const createBookmarkMutation = trpc.bookmark.createBookmark.useMutation({
    onSuccess: () => {
      toast.success('Bookmark added!');
      setShowBookmarkPopover(false);
      setIsCreatingFolder(false);
      setNewFolderName('');
      void utils.bookmark.listFolders.invalidate();
    }
  });

  const createFolderMutation = trpc.bookmark.createFolder.useMutation({
    onSuccess: () => {
      toast.success('Folder created!');
      setIsCreatingFolder(false);
      setNewFolderName('');
      void utils.bookmark.listFolders.invalidate();
    }
  });

  const handleAddBookmark = (currentTitle: string) => {
    setBookmarkTitle(currentTitle);
    setSelectedFolderId(folders?.[0]?.id || null);
    setShowBookmarkPopover(true);
  };

  const handleSaveBookmark = (url: string) => {
    createBookmarkMutation.mutate({
      title: bookmarkTitle || 'New Bookmark',
      url,
      folderId: selectedFolderId
    });
  };

  const handleSaveFolder = () => {
    if (!newFolderName.trim()) return;
    createFolderMutation.mutate({
      name: newFolderName.trim()
    });
  };

  const closeBookmarkPopover = () => {
    setShowBookmarkPopover(false);
    setIsCreatingFolder(false);
    setNewFolderName('');
  };

  return {
    folders,
    showBookmarkPopover,
    bookmarkTitle,
    setBookmarkTitle,
    selectedFolderId,
    setSelectedFolderId,
    isCreatingFolder,
    setIsCreatingFolder,
    newFolderName,
    setNewFolderName,
    createBookmarkMutation,
    createFolderMutation,
    handleAddBookmark,
    handleSaveBookmark,
    handleSaveFolder,
    closeBookmarkPopover,
  };
}
