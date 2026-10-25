import { environment } from '@/environments/environment';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, forkJoin, map, of, tap } from 'rxjs';
import {
    CommitLinkedResponse,
    SavedAttachment,
    TempAttachment,
    TempAttachmentDeleteResponse,
    TempAttachmentUploadResponse,
} from './attachment.types';

/**
 * Tracks temp attachments uploaded for a document that isn't saved yet.
 *
 * - `upload()` POSTs immediately and adds the returned items to `pending`.
 * - `removeOne()` deletes one staged item on the server and from `pending`.
 * - `commit()` clears `pending` without deleting (call on Save).
 * - `cleanup()` deletes everything in `pending` (call on Cancel / navigation).
 */
@Injectable({ providedIn: 'root' })
export class AttachmentService {
    private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrl}/attachments/temp`;
    private attachmentsUrl = `${environment.apiUrl}/attachments`;

    /** Files currently staged on the server but not yet committed. */
    pending = signal<TempAttachment[]>([]);

    /** Already-saved attachments for the document being edited. */
    saved = signal<SavedAttachment[]>([]);

    /** Ids of saved attachments the user removed in this session — sent in the PUT body. */
    deletedIds = signal<number[]>([]);

    loadSaved(items: SavedAttachment[] | null | undefined): void {
        this.saved.set(items ?? []);
        this.deletedIds.set([]);
    }

    removeSaved(att: SavedAttachment): void {
        this.saved.update((cur) => cur.filter((a) => a.id !== att.id));
        this.deletedIds.update((cur) => (cur.includes(att.id) ? cur : [...cur, att.id]));
    }

    deleteSaved(id: number): Observable<void> {
        return this.http.delete<TempAttachmentDeleteResponse>(`${this.attachmentsUrl}/${id}`).pipe(
            tap(() => this.saved.update((cur) => cur.filter((a) => a.id !== id))),
            map(() => void 0),
        );
    }

    upload(files: File[]): Observable<TempAttachment[]> {
        if (!files.length) return of([]);
        const form = new FormData();
        for (const f of files) form.append('Files', f, f.name);
        return this.http.post<TempAttachmentUploadResponse>(`${this.baseUrl}/upload`, form).pipe(
            tap((res) => {
                if (res?.success && res.data?.length) {
                    this.pending.update((cur) => [...cur, ...res.data]);
                }
            }),
            map((res) => res?.data ?? []),
        );
    }

    removeOne(att: TempAttachment): Observable<void> {
        const body = {
            storedTempFolderPath: att.storedTempFolderPath,
            storedFileName: att.storedFileName,
        };
        return this.http
            .delete<TempAttachmentDeleteResponse>(this.baseUrl, { body })
            .pipe(
                tap(() => {
                    this.pending.update((cur) => cur.filter((a) => a.tempId !== att.tempId));
                }),
                map(() => void 0),
            );
    }

    commitLinked(
        referenceDocId: number,
        tempFiles: TempAttachment[],
        documentTypeId = 0,
        notes = '',
    ): Observable<CommitLinkedResponse> {
        return this.http.post<CommitLinkedResponse>(`${this.attachmentsUrl}/commit/linked`, {
            documentTypeId,
            referenceDocId,
            notes,
            tempFiles,
        });
    }

    download(id: number): Observable<HttpResponse<Blob>> {
        return this.http.get(`${this.attachmentsUrl}/${id}/download`, {
            observe: 'response',
            responseType: 'blob',
        });
    }

    commit(): void {
        this.pending.set([]);
        this.saved.set([]);
        this.deletedIds.set([]);
    }

    cleanup(): Observable<void> {
        const items = this.pending();
        if (items.length === 0) return of(void 0);
        return forkJoin(items.map((a) => this.removeOne(a))).pipe(map(() => void 0));
    }
}
