"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Plus, X } from "lucide-react";

const MIN_OPTIONS = 2;

const ensureOption = (option) => ({
  id: option?.id || `poll-${Math.random().toString(36).slice(2)}`,
  text: option?.text || "",
});

export default function PollBuilder({
  enabled,
  onEnabledChange,
  question,
  onQuestionChange,
  allowMultiple,
  onAllowMultipleChange,
  options,
  onOptionsChange,
  responsesEnabled,
  onResponsesEnabledChange,
  errorMessage,
}) {
  const optionList = useMemo(() => options.map(ensureOption), [options]);

  const handleAddOption = () => {
    onOptionsChange([...optionList, ensureOption({})]);
  };

  const handleRemoveOption = (id) => {
    if (optionList.length <= MIN_OPTIONS) {
      return;
    }
    onOptionsChange(optionList.filter((option) => option.id !== id));
  };

  const handleOptionChange = (id, value) => {
    onOptionsChange(
      optionList.map((option) =>
        option.id === id ? { ...option, text: value } : option
      )
    );
  };

  return (
    <Card>
      <CardHeader className="flex items-start justify-between space-y-0">
        <div className="flex flex-col">
          <CardTitle className="text-base">Poll</CardTitle>
          <p className="text-xs text-muted-foreground">
            Attach an optional poll to collect quick feedback from students.
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(checked) => onEnabledChange(Boolean(checked))}
          aria-label="Enable poll"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {!enabled ? (
          <p className="text-sm text-muted-foreground">
            Toggle the switch to enable a poll on this announcement.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="poll-question">Question *</Label>
              <Input
                id="poll-question"
                placeholder="Enter your poll question"
                value={question}
                onChange={(event) => onQuestionChange(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  id="poll-responses-enabled"
                  checked={responsesEnabled}
                  onCheckedChange={(checked) => onResponsesEnabledChange(Boolean(checked))}
                />
                <div className="space-y-0.5">
                  <Label htmlFor="poll-responses-enabled" className="cursor-pointer">
                    Allow students to vote
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Turn off to close the poll without deleting it.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="poll-allow-multiple"
                  checked={allowMultiple}
                  onCheckedChange={(checked) => onAllowMultipleChange(Boolean(checked))}
                />
                <Label htmlFor="poll-allow-multiple" className="cursor-pointer">
                  Allow multiple answers
                </Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Options *</Label>
              <div className="space-y-2">
                {optionList.map((option, index) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <Input
                      placeholder={`Choice ${index + 1}`}
                      value={option.text}
                      onChange={(event) => handleOptionChange(option.id, event.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOption(option.id)}
                      disabled={optionList.length <= MIN_OPTIONS}
                      title={
                        optionList.length <= MIN_OPTIONS
                          ? "At least two options are required"
                          : "Remove option"
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddOption}>
                <Plus className="h-4 w-4 mr-2" /> Add option
              </Button>
            </div>
            {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
