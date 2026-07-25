package com.sewasathi.dto.response;

import com.sewasathi.entity.User;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class TaskPartyResponse {
    private Long id;
    private String fullName;
    private String phone;

    public static TaskPartyResponse from(User user) {
        if (user == null) {
            return null;
        }
        return new TaskPartyResponse(user.getId(), user.getFullName(), user.getPhone());
    }
}
