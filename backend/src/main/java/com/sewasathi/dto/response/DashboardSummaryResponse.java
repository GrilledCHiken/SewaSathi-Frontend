package com.sewasathi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class DashboardSummaryResponse {
    private long activeTasks;
    private long completedTasks;
}
