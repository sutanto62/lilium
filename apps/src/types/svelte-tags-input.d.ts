declare module 'svelte-tags-input' {
    import { SvelteComponentTyped } from 'svelte';

    export interface TagsInputEvents {
        tag: string;
        tags: string[];
    }

    export interface TagsInputProps {
        tags?: string[];
        placeholder?: string;
        allowPaste?: boolean;
        allowDrop?: boolean;
        onlyUnique?: boolean;
        addKeys?: number[];
        maxTags?: number;
        onlyDropTags?: boolean;
        removeKeys?: number[];
        allowBlur?: boolean;
        splitWith?: string;
        autoComplete?: string[];
        autoCompleteKey?: number[];
        name?: string;
        id?: string;
        labelText?: string;
        labelShow?: boolean;
    }

    export default class Tags extends SvelteComponentTyped<
        TagsInputProps,
        {
            'tags:add': CustomEvent<TagsInputEvents>;
            'tags:remove': CustomEvent<TagsInputEvents>;
        }
    > { }
} 