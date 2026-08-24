'use client';

import * as React from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Indent,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Outdent,
  Quote,
  Redo,
  RemoveFormatting,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo,
  Unlink,
} from 'lucide-react';

import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Input } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Separator } from './separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';
import { cn } from '../lib/utils';

export interface RichTextEditorRef {
  focus: () => void;
  getHTML: () => string;
  setHTML: (html: string) => void;
  insertText: (text: string) => void;
  insertHTML: (html: string) => void;
}

export interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  className?: string;
  editorClassName?: string;
  minHeight?: string | number;
  disabled?: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
  toolbarPosition?: 'top' | 'bottom';
  toolbarExtra?: React.ReactNode;
  borderless?: boolean;
}

const FONT_FAMILIES = [
  { label: 'Sans Serif', value: 'sans-serif' },
  { label: 'Serif', value: 'Georgia, serif' },
  { label: 'Fixed Width', value: 'monospace' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Calibri', value: 'Calibri, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Tahoma', value: 'Tahoma, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
];

const FONT_SIZES = [
  { label: 'Small', value: '1', display: '12px' },
  { label: 'Normal', value: '3', display: '14px' },
  { label: 'Large', value: '5', display: '18px' },
  { label: 'Huge', value: '6', display: '24px' },
];

const TEXT_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3',
  '#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#8e7cc3',
  '#5b0f00', '#660000', '#783f04', '#7f6000', '#274e13', '#0c343d', '#1155cc', '#351c75',
];

const HIGHLIGHT_COLORS = [
  'transparent',
  '#ffff00', '#ffeb3b', '#fff59d', '#ffc107',
  '#ff9800', '#ff5722', '#f44336', '#e91e63',
  '#4caf50', '#8bc34a', '#cddc39', '#00bcd4',
  '#2196f3', '#03a9f4', '#3f51b5', '#9c27b0',
  '#e0e0e0', '#eeeeee', '#f5f5f5', '#ffffff',
];

function findMatchingFontLabel(fontString: string): string | null {
  if (!fontString) return null;
  const cleanFont = fontString.replace(/["']/g, '').toLowerCase().trim();

  for (const font of FONT_FAMILIES) {
    const labelLower = font.label.toLowerCase();
    const valLower = font.value.replace(/["']/g, '').toLowerCase();
    const parts = valLower.split(',').map((p) => p.trim());

    if (
      cleanFont === labelLower ||
      cleanFont === valLower ||
      parts.some((p) => p && cleanFont === p && p !== 'sans-serif' && p !== 'serif' && p !== 'monospace') ||
      parts.some((p) => p && cleanFont.startsWith(p) && p !== 'sans-serif' && p !== 'serif' && p !== 'monospace')
    ) {
      return font.label;
    }
  }

  for (const font of FONT_FAMILIES) {
    const labelLower = font.label.toLowerCase();
    if (labelLower !== 'sans serif' && labelLower !== 'serif' && cleanFont.includes(labelLower)) {
      return font.label;
    }
  }

  if (cleanFont.includes('monospace') || cleanFont.includes('courier')) return 'Fixed Width';
  if (cleanFont.includes('georgia') || cleanFont.includes('serif')) return 'Serif';
  if (cleanFont.includes('sans-serif') || cleanFont.includes('arial') || cleanFont.includes('helvetica')) return 'Sans Serif';

  return null;
}

function detectFontFamily(editorEl: HTMLDivElement | null): string {
  if (!editorEl) return 'Sans Serif';
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return 'Sans Serif';

  const range = selection.getRangeAt(0);
  if (!editorEl.contains(range.commonAncestorContainer)) return 'Sans Serif';

  let fontCmdValue = '';
  try {
    fontCmdValue = document.queryCommandValue('fontName') || '';
  } catch {
    fontCmdValue = '';
  }
  fontCmdValue = fontCmdValue.replace(/^["']|["']$/g, '').trim();

  let startNode: Node | null = range.startContainer;
  if (startNode.nodeType === Node.TEXT_NODE) startNode = startNode.parentElement;

  let startFont = '';
  if (startNode && startNode instanceof HTMLElement && editorEl.contains(startNode)) {
    const fontEl = startNode.closest('font[face], [style*="font-family"]');
    if (fontEl) {
      startFont = fontEl.getAttribute('face') || (fontEl as HTMLElement).style.fontFamily || '';
    }
    if (!startFont) {
      startFont = window.getComputedStyle(startNode).fontFamily || '';
    }
  }

  const primaryFontToMatch = fontCmdValue || startFont;

  if (!range.collapsed) {
    let endNode: Node | null = range.endContainer;
    if (endNode.nodeType === Node.TEXT_NODE) endNode = endNode.parentElement;
    if (endNode && endNode instanceof HTMLElement && editorEl.contains(endNode)) {
      let endFont = '';
      const endFontEl = endNode.closest('font[face], [style*="font-family"]');
      if (endFontEl) {
        endFont = endFontEl.getAttribute('face') || (endFontEl as HTMLElement).style.fontFamily || '';
      }
      if (!endFont) {
        endFont = window.getComputedStyle(endNode).fontFamily || '';
      }

      const startMatch = findMatchingFontLabel(primaryFontToMatch);
      const endMatch = findMatchingFontLabel(endFont || primaryFontToMatch);
      if (startMatch && endMatch && startMatch !== endMatch) {
        return 'Mixed';
      }
    }
  }

  const matchedLabel = findMatchingFontLabel(primaryFontToMatch);
  return matchedLabel || 'Sans Serif';
}

function getExecFontName(font: { label: string; value: string }): string {
  if (font.label === 'Sans Serif') return 'sans-serif';
  if (font.label === 'Fixed Width') return 'monospace';
  if (font.label === 'Serif') return 'Georgia';
  const firstFont = font.value.split(',')[0]?.trim().replace(/^["']|["']$/g, '');
  return firstFont || font.label;
}

function cleanPastedHTML(html: string): string {
  if (!html) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const forbiddenTags = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'link', 'meta', 'applet'];
  forbiddenTags.forEach((tag) => {
    const elements = doc.querySelectorAll(tag);
    elements.forEach((el) => el.remove());
  });

  const allElements = doc.querySelectorAll('*');
  allElements.forEach((el) => {
    const attributes = Array.from(el.attributes);
    attributes.forEach((attr) => {
      if (attr.name.startsWith('on') || attr.name === 'srcset') {
        el.removeAttribute(attr.name);
      }
      if ((attr.name === 'href' || attr.name === 'src') && attr.value.trim().toLowerCase().startsWith('javascript:')) {
        el.removeAttribute(attr.name);
      }
    });

    if (el.getAttribute('class')?.includes('Mso') || el.getAttribute('class')?.includes('Apple-')) {
      el.removeAttribute('class');
    }
  });

  return doc.body.innerHTML;
}

export const RichTextEditor = React.forwardRef<RichTextEditorRef, RichTextEditorProps>(
  (
    {
      value = '',
      onChange,
      placeholder = 'Write your message here...',
      className,
      editorClassName,
      minHeight = '14rem',
      disabled = false,
      onBlur,
      onFocus,
      toolbarPosition = 'bottom',
      toolbarExtra,
      borderless = false,
    },
    ref,
  ) => {
    const editorRef = React.useRef<HTMLDivElement>(null);
    const savedSelection = React.useRef<Range | null>(null);

    const [isBold, setIsBold] = React.useState(false);
    const [isItalic, setIsItalic] = React.useState(false);
    const [isUnderline, setIsUnderline] = React.useState(false);
    const [isStrikethrough, setIsStrikethrough] = React.useState(false);
    const [isBulletList, setIsBulletList] = React.useState(false);
    const [isNumberedList, setIsNumberedList] = React.useState(false);
    const [currentAlignment, setCurrentAlignment] = React.useState<'left' | 'center' | 'right' | 'justify'>('left');
    const [currentFontFamily, setCurrentFontFamily] = React.useState<string>('Sans Serif');

    const [linkUrl, setLinkUrl] = React.useState('');
    const [linkText, setLinkText] = React.useState('');
    const [isLinkPopoverOpen, setIsLinkPopoverOpen] = React.useState(false);
    const [customColor, setCustomColor] = React.useState('#000000');

    React.useEffect(() => {
      if (editorRef.current) {
        const currentHTML = editorRef.current.innerHTML;
        const normalizedPropValue = value || '';
        if (currentHTML !== normalizedPropValue) {
          editorRef.current.innerHTML = normalizedPropValue;
        }
      }
    }, [value]);

    const saveCurrentSelection = React.useCallback(() => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        savedSelection.current = selection.getRangeAt(0).cloneRange();
      }
    }, []);

    const restoreSelection = () => {
      if (savedSelection.current) {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(savedSelection.current);
        }
      }
    };

    const updateFormattingState = React.useCallback(() => {
      if (!editorRef.current) return;
      try {
        setIsBold(document.queryCommandState('bold'));
        setIsItalic(document.queryCommandState('italic'));
        setIsUnderline(document.queryCommandState('underline'));
        setIsStrikethrough(document.queryCommandState('strikethrough'));
        setIsBulletList(document.queryCommandState('insertUnorderedList'));
        setIsNumberedList(document.queryCommandState('insertOrderedList'));

        if (document.queryCommandState('justifyCenter')) setCurrentAlignment('center');
        else if (document.queryCommandState('justifyRight')) setCurrentAlignment('right');
        else if (document.queryCommandState('justifyFull')) setCurrentAlignment('justify');
        else setCurrentAlignment('left');

        const detectedFont = detectFontFamily(editorRef.current);
        setCurrentFontFamily(detectedFont);
      } catch {
        // Ignore selection errors
      }
    }, []);

    React.useEffect(() => {
      const handleSelectionChange = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && editorRef.current) {
          const range = sel.getRangeAt(0);
          if (editorRef.current.contains(range.commonAncestorContainer)) {
            saveCurrentSelection();
            updateFormattingState();
          }
        }
      };

      document.addEventListener('selectionchange', handleSelectionChange);
      return () => {
        document.removeEventListener('selectionchange', handleSelectionChange);
      };
    }, [updateFormattingState]);

    const triggerChange = React.useCallback(() => {
      if (editorRef.current && onChange) {
        const html = editorRef.current.innerHTML;
        const isEmpty = !editorRef.current.innerText.trim() && !editorRef.current.querySelector('img, table, iframe');
        onChange(isEmpty && (html === '<br>' || html === '<div><br></div>') ? '' : html);
      }
    }, [onChange]);

    const executeCommand = (command: string, value: string | undefined = undefined) => {
      if (disabled || !editorRef.current) return;
      editorRef.current.focus();
      restoreSelection();
      document.execCommand(command, false, value);
      saveCurrentSelection();
      updateFormattingState();
      triggerChange();
    };

    const handleApplyHeading = (tag: string) => {
      executeCommand('formatBlock', tag);
    };

    const handleApplyFontFamily = (font: { label: string; value: string }) => {
      const execFont = getExecFontName(font);
      executeCommand('fontName', execFont);
      setCurrentFontFamily(font.label);
    };

    const handleApplyFontSize = (sizeVal: string) => {
      executeCommand('fontSize', sizeVal);
    };

    const handleApplyTextColor = (color: string) => {
      executeCommand('foreColor', color);
    };

    const handleApplyHighlightColor = (color: string) => {
      if (color === 'transparent') {
        executeCommand('removeFormat');
      } else {
        executeCommand('hiliteColor', color);
      }
    };

    const handleOpenLinkPopover = () => {
      saveCurrentSelection();
      const selection = window.getSelection();
      const selectedStr = selection ? selection.toString() : '';
      setLinkText(selectedStr);
      setLinkUrl('');
      setIsLinkPopoverOpen(true);
    };

    const handleInsertLink = (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!linkUrl.trim()) return;

      let validUrl = linkUrl.trim();
      if (!/^https?:\/\//i.test(validUrl) && !/^mailto:/i.test(validUrl) && !/^tel:/i.test(validUrl)) {
        validUrl = `https://${validUrl}`;
      }

      if (editorRef.current) {
        editorRef.current.focus();
        restoreSelection();

        if (linkText.trim() && (!savedSelection.current || savedSelection.current.collapsed)) {
          const anchorHtml = `<a href="${validUrl}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">${linkText.trim()}</a>`;
          document.execCommand('insertHTML', false, anchorHtml);
        } else {
          document.execCommand('createLink', false, validUrl);
        }

        saveCurrentSelection();
        triggerChange();
      }

      setIsLinkPopoverOpen(false);
      setLinkUrl('');
      setLinkText('');
    };

    const handleRemoveLink = () => {
      executeCommand('unlink');
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();

      const html = e.clipboardData.getData('text/html');
      const text = e.clipboardData.getData('text/plain');

      if (html) {
        const cleaned = cleanPastedHTML(html);
        document.execCommand('insertHTML', false, cleaned);
      } else if (text) {
        const formattedText = text
          .split(/\r?\n/)
          .map((line) => line || '<br>')
          .join('</div><div>');

        if (formattedText.includes('</div><div>')) {
          document.execCommand('insertHTML', false, `<div>${formattedText}</div>`);
        } else {
          document.execCommand('insertText', false, text);
        }
      }

      triggerChange();
    };

    React.useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          editorRef.current?.focus();
        },
        getHTML: () => {
          return editorRef.current?.innerHTML || '';
        },
        setHTML: (newHtml: string) => {
          if (editorRef.current) {
            editorRef.current.innerHTML = newHtml;
            triggerChange();
          }
        },
        insertText: (text: string) => {
          if (editorRef.current) {
            editorRef.current.focus();
            restoreSelection();
            document.execCommand('insertText', false, text);
            saveCurrentSelection();
            triggerChange();
          }
        },
        insertHTML: (html: string) => {
          if (editorRef.current) {
            editorRef.current.focus();
            restoreSelection();
            document.execCommand('insertHTML', false, html);
            saveCurrentSelection();
            triggerChange();
          }
        },
      }),
      [triggerChange],
    );

    const renderToolbar = () => (
      <div className={cn(
        "flex flex-wrap items-center gap-0.5 px-2 py-1 select-none",
        toolbarPosition === 'bottom'
          ? "border-t border-zinc-200/80 bg-zinc-50/70 rounded-b-lg dark:border-zinc-800 dark:bg-zinc-900/50"
          : "border-b border-zinc-200/80 bg-zinc-50/70 rounded-t-lg dark:border-zinc-800 dark:bg-zinc-900/50"
      )}>
        {/* Undo / Redo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => executeCommand('undo')}
              className="h-7 w-7 p-0 text-zinc-600 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              <Undo className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => executeCommand('redo')}
              className="h-7 w-7 p-0 text-zinc-600 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              <Redo className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-4 bg-zinc-300 dark:bg-zinc-700" />

        {/* Font Family */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild disabled={disabled}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onMouseDown={() => {
                    saveCurrentSelection();
                  }}
                  className="h-7 px-1.5 text-xs font-normal text-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <span className="truncate max-w-[90px]">{currentFontFamily}</span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Font Family</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto">
            {FONT_FAMILIES.map((font) => (
              <DropdownMenuItem
                key={font.label}
                onClick={() => handleApplyFontFamily(font)}
                style={{ fontFamily: font.value }}
                className={cn(
                  'text-xs cursor-pointer justify-between',
                  currentFontFamily === font.label && 'bg-accent font-semibold'
                )}
              >
                {font.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Font Size Dropdown */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild disabled={disabled}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-1.5 text-xs font-normal text-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <span className="font-serif font-bold text-xs">T<span className="text-[9px]">T</span></span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Font Size</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start">
            {FONT_SIZES.map((size) => (
              <DropdownMenuItem
                key={size.label}
                onClick={() => handleApplyFontSize(size.value)}
                className="text-xs cursor-pointer flex items-center justify-between gap-4"
              >
                <span>{size.label}</span>
                <span className="text-[10px] text-muted-foreground">{size.display}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="mx-1 h-4 bg-zinc-300 dark:bg-zinc-700" />

        {/* Bold, Italic, Underline */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => executeCommand('bold')}
              className={cn(
                'h-7 w-7 p-0 text-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800',
                isBold && 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300',
              )}
            >
              <Bold className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Bold (Ctrl+B)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => executeCommand('italic')}
              className={cn(
                'h-7 w-7 p-0 text-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800',
                isItalic && 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300',
              )}
            >
              <Italic className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Italic (Ctrl+I)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => executeCommand('underline')}
              className={cn(
                'h-7 w-7 p-0 text-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800',
                isUnderline && 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300',
              )}
            >
              <UnderlineIcon className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Underline (Ctrl+U)</TooltipContent>
        </Tooltip>

        {/* Text / Highlight Color Picker */}
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild disabled={disabled}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <div className="flex flex-col items-center justify-center">
                    <span className="font-bold text-xs leading-none">A</span>
                    <div className="h-1 w-3.5 bg-zinc-800 dark:bg-zinc-200 rounded-xs mt-0.5" />
                  </div>
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Text Color & Background</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-56 p-2.5" align="start">
            <div className="text-xs font-semibold mb-1.5 text-zinc-700 dark:text-zinc-300">Text color</div>
            <div className="grid grid-cols-8 gap-1 mb-2.5">
              {TEXT_COLORS.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApplyTextColor(c)}
                  className="h-4 w-4 rounded-xs border border-zinc-300 hover:scale-115 transition-transform dark:border-zinc-700"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="text-xs font-semibold mb-1.5 text-zinc-700 dark:text-zinc-300 border-t pt-2 dark:border-zinc-800">Highlight</div>
            <div className="grid grid-cols-8 gap-1">
              {HIGHLIGHT_COLORS.slice(0, 16).map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApplyHighlightColor(c)}
                  className="h-4 w-4 rounded-xs border border-zinc-300 hover:scale-110 transition-transform dark:border-zinc-700 flex items-center justify-center text-[8px]"
                  style={{ backgroundColor: c === 'transparent' ? '#fff' : c }}
                >
                  {c === 'transparent' ? '✕' : ''}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="mx-1 h-4 bg-zinc-300 dark:bg-zinc-700" />

        {/* Alignment */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild disabled={disabled}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {currentAlignment === 'center' ? <AlignCenter className="h-3.5 w-3.5" /> :
                    currentAlignment === 'right' ? <AlignRight className="h-3.5 w-3.5" /> :
                      currentAlignment === 'justify' ? <AlignJustify className="h-3.5 w-3.5" /> :
                        <AlignLeft className="h-3.5 w-3.5" />}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Alignment</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="min-w-[7rem]">
            <DropdownMenuItem onClick={() => executeCommand('justifyLeft')} className="text-xs flex items-center gap-2">
              <AlignLeft className="h-3.5 w-3.5" /> Left
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => executeCommand('justifyCenter')} className="text-xs flex items-center gap-2">
              <AlignCenter className="h-3.5 w-3.5" /> Center
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => executeCommand('justifyRight')} className="text-xs flex items-center gap-2">
              <AlignRight className="h-3.5 w-3.5" /> Right
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => executeCommand('justifyFull')} className="text-xs flex items-center gap-2">
              <AlignJustify className="h-3.5 w-3.5" /> Justify
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Lists */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => executeCommand('insertUnorderedList')}
              className={cn(
                'h-7 w-7 p-0 text-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800',
                isBulletList && 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300',
              )}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Bulleted List</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => executeCommand('insertOrderedList')}
              className={cn(
                'h-7 w-7 p-0 text-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800',
                isNumberedList && 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300',
              )}
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Numbered List</TooltipContent>
        </Tooltip>

        {/* Indent / Outdent */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => executeCommand('outdent')}
              className="h-7 w-7 p-0 text-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Outdent className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Decrease Indent</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => executeCommand('indent')}
              className="h-7 w-7 p-0 text-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Indent className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Increase Indent</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-4 bg-zinc-300 dark:bg-zinc-700" />

        {/* Link */}
        <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild disabled={disabled}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenLinkPopover}
                  className="h-7 w-7 p-0 text-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Insert Link (Ctrl+K)</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-72 p-3" align="start">
            <form onSubmit={handleInsertLink} className="space-y-2.5">
              <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Insert Link</div>
              <Input
                placeholder="Display text (optional)"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                className="h-7 text-xs"
              />
              <Input
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="h-7 text-xs"
                autoFocus
              />
              <div className="flex items-center justify-end gap-1.5 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setIsLinkPopoverOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="h-7 px-3 text-xs" disabled={!linkUrl.trim()}>
                  Insert
                </Button>
              </div>
            </form>
          </PopoverContent>
        </Popover>

        {/* Clear formatting */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => executeCommand('removeFormat')}
              className="h-7 w-7 p-0 text-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <RemoveFormatting className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clear Formatting</TooltipContent>
        </Tooltip>

        {/* Toolbar Extra slot */}
        {toolbarExtra && (
          <div className="ml-auto flex items-center gap-1 pl-2">
            {toolbarExtra}
          </div>
        )}
      </div>
    );

    return (
      <TooltipProvider delayDuration={300}>
        <div
          className={cn(
            'flex flex-col text-zinc-900 transition-colors dark:text-zinc-100',
            borderless
              ? 'border-0 bg-transparent'
              : 'rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950',
            disabled && 'opacity-60 cursor-not-allowed',
            className,
          )}
        >
          {toolbarPosition === 'top' && renderToolbar()}

          {/* Editable Canvas */}
          <div className="relative flex-1 cursor-text p-0 ckediter-mail-function [&_ol]:list-decimal [&_ol]:ml-4 [&_ul]:list-disc [&_ul]:ml-4">
            <div
              ref={editorRef}
              contentEditable={!disabled}
              suppressContentEditableWarning
              onInput={() => {
                updateFormattingState();
                triggerChange();
              }}
              onKeyUp={() => {
                saveCurrentSelection();
                updateFormattingState();
              }}
              onMouseUp={() => {
                saveCurrentSelection();
                updateFormattingState();
              }}
              onPaste={handlePaste}
              onFocus={() => {
                updateFormattingState();
                onFocus?.();
              }}
              onBlur={() => {
                saveCurrentSelection();
                onBlur?.();
              }}
              style={{ minHeight }}
              className={cn(
                'prose prose-sm dark:prose-invert max-w-none px-3.5 py-3 text-sm leading-relaxed text-zinc-900 outline-none transition-all dark:text-zinc-100',
                '[&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5 [&_blockquote]:border-l-2 [&_blockquote]:border-zinc-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-zinc-600 dark:[&_blockquote]:border-zinc-700 dark:[&_blockquote]:text-zinc-400',
                '[&_h1]:text-xl [&_h1]:font-bold [&_h1]:my-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:my-1.5 [&_h3]:text-base [&_h3]:font-medium [&_h3]:my-1',
                '[&_a]:text-blue-600 [&_a]:underline dark:[&_a]:text-blue-400',
                'empty:before:text-zinc-400 empty:before:content-[attr(data-placeholder)] empty:before:pointer-events-none empty:before:absolute empty:before:left-3.5 empty:before:top-3',
                editorClassName,
              )}
              data-placeholder={placeholder}
            />
          </div>

          {toolbarPosition === 'bottom' && renderToolbar()}
        </div>
      </TooltipProvider>
    );
  },
);

RichTextEditor.displayName = 'RichTextEditor';
