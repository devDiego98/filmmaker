import { useState } from "react"
import {
  Controller,
  type Control,
  type FieldError,
  type FieldValues,
  type Path,
  type UseFormRegisterReturn,
} from "react-hook-form"
import { CalendarIcon, Plus, X } from "lucide-react"
import { Field, FieldLabel, FieldError as FieldErrorText } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatDateEs, fromISODate, toISODate } from "@/lib/date"
import { uploadMedia } from "@/lib/mediaStorage"

type Option = { value: string; label: string }

function ErrorText({ error }: { error?: FieldError }) {
  return <FieldErrorText errors={error ? [error] : undefined} />
}

export function TextField({
  label,
  error,
  type,
  placeholder,
  ...register
}: {
  label: string
  error?: FieldError
  type?: string
  placeholder?: string
} & UseFormRegisterReturn) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel>{label}</FieldLabel>
      <Input type={type} placeholder={placeholder} aria-invalid={!!error} {...register} />
      <ErrorText error={error} />
    </Field>
  )
}

export function NumberField({
  label,
  error,
  ...register
}: { label: string; error?: FieldError } & UseFormRegisterReturn) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel>{label}</FieldLabel>
      <Input type="number" step="any" aria-invalid={!!error} {...register} />
      <ErrorText error={error} />
    </Field>
  )
}

export function TextareaField({
  label,
  error,
  ...register
}: { label: string; error?: FieldError } & UseFormRegisterReturn) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel>{label}</FieldLabel>
      <Textarea aria-invalid={!!error} {...register} />
      <ErrorText error={error} />
    </Field>
  )
}

export function SelectField<TValues extends FieldValues>({
  label,
  error,
  control,
  name,
  options,
  placeholder,
}: {
  label: string
  error?: FieldError
  control: Control<TValues>
  name: Path<TValues>
  options: Option[]
  placeholder?: string
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel>{label}</FieldLabel>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select value={field.value ?? ""} onValueChange={field.onChange}>
            <SelectTrigger className="w-full" aria-invalid={!!error}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <ErrorText error={error} />
    </Field>
  )
}

export function CheckboxField<TValues extends FieldValues>({
  label,
  control,
  name,
}: {
  label: string
  control: Control<TValues>
  name: Path<TValues>
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
          {label}
        </label>
      )}
    />
  )
}

export function MultiCheckboxField<TValues extends FieldValues>({
  label,
  control,
  name,
  options,
  emptyHint,
}: {
  label: string
  control: Control<TValues>
  name: Path<TValues>
  options: Option[]
  emptyHint?: string
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Controller
        control={control}
        name={name}
        render={({ field }) => {
          const selected: string[] = field.value ?? []
          const toggle = (value: string) => {
            field.onChange(
              selected.includes(value)
                ? selected.filter((v) => v !== value)
                : [...selected, value]
            )
          }
          if (options.length === 0) {
            return <p className="text-sm text-muted-foreground">{emptyHint}</p>
          }
          return (
            <div className="flex max-h-40 flex-col gap-2 overflow-y-auto rounded-lg border p-2">
              {options.map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selected.includes(option.value)}
                    onCheckedChange={() => toggle(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          )
        }}
      />
    </Field>
  )
}

export function TagsField<TValues extends FieldValues>({
  label,
  control,
  name,
  placeholder,
}: {
  label: string
  control: Control<TValues>
  name: Path<TValues>
  placeholder?: string
}) {
  const [draft, setDraft] = useState("")

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Controller
        control={control}
        name={name}
        render={({ field }) => {
          const tags: string[] = field.value ?? []
          const addTag = () => {
            const value = draft.trim()
            if (value && !tags.includes(value)) {
              field.onChange([...tags, value])
            }
            setDraft("")
          }
          return (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Input
                  value={draft}
                  placeholder={placeholder}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                />
                <Button type="button" variant="secondary" onClick={addTag}>
                  Agregar
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => field.onChange(tags.filter((t) => t !== tag))}
                        className="rounded-full hover:bg-muted-foreground/20"
                        aria-label={`Quitar ${tag}`}
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )
        }}
      />
    </Field>
  )
}

/** Uploads to Supabase Storage (`media` bucket) under the project's folder and stores the public URL. */
export function FileField<TValues extends FieldValues>({
  label,
  control,
  name,
  accept,
  previewType = "image",
  hint,
  projectId,
}: {
  label: string
  control: Control<TValues>
  name: Path<TValues>
  accept?: string
  previewType?: "image" | "video"
  hint?: string
  projectId: string | undefined
}) {
  const [uploading, setUploading] = useState(false)
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <div className="flex items-center gap-3">
            {field.value &&
              (previewType === "image" ? (
                <img
                  src={field.value}
                  alt=""
                  className="size-14 shrink-0 rounded-lg border object-cover"
                />
              ) : (
                <video src={field.value} className="h-14 rounded-lg border" controls />
              ))}
            <Input
              type="file"
              accept={accept}
              disabled={uploading || !projectId}
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file || !projectId) return
                setUploading(true)
                try {
                  field.onChange(await uploadMedia(projectId, file))
                } finally {
                  setUploading(false)
                }
              }}
            />
            {field.value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => field.onChange(undefined)}
              >
                Quitar
              </Button>
            )}
          </div>
        )}
      />
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </Field>
  )
}

/** Uploads to Supabase Storage (`media` bucket) under the project's folder and stores the public URLs. */
export function MultiFileField<TValues extends FieldValues>({
  label,
  control,
  name,
  hint,
  projectId,
}: {
  label: string
  control: Control<TValues>
  name: Path<TValues>
  hint?: string
  projectId: string | undefined
}) {
  const [uploading, setUploading] = useState(false)
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Controller
        control={control}
        name={name}
        render={({ field }) => {
          const photos: string[] = field.value ?? []
          return (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                {photos.map((url, index) => (
                  <div key={url} className="group relative">
                    <img
                      src={url}
                      alt=""
                      className="size-16 rounded-lg border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => field.onChange(photos.filter((_, i) => i !== index))}
                      className="absolute -right-1.5 -top-1.5 rounded-full border bg-background p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Quitar foto"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
                <label
                  className={`flex size-16 items-center justify-center rounded-lg border border-dashed text-muted-foreground hover:bg-muted ${uploading || !projectId ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
                >
                  <Plus className="size-4" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading || !projectId}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file || !projectId) return
                      setUploading(true)
                      try {
                        field.onChange([...photos, await uploadMedia(projectId, file)])
                      } finally {
                        setUploading(false)
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          )
        }}
      />
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </Field>
  )
}

/** Value/onChange work in ISO `yyyy-MM-dd` strings. */
export function DateField<TValues extends FieldValues>({
  label,
  error,
  control,
  name,
}: {
  label: string
  error?: FieldError
  control: Control<TValues>
  name: Path<TValues>
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel>{label}</FieldLabel>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                aria-invalid={!!error}
                className="w-full justify-start font-normal"
              >
                <CalendarIcon className="mr-1" />
                {field.value ? formatDateEs(field.value) : "Elegir fecha"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={field.value ? fromISODate(field.value) : undefined}
                onSelect={(date) => date && field.onChange(toISODate(date))}
              />
            </PopoverContent>
          </Popover>
        )}
      />
      <ErrorText error={error} />
    </Field>
  )
}
